import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApiError } from '../../common/errors/api-error';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto, AppointmentStatus } from './dto/update-appointment.dto';
import { RespondAppointmentDto, AppointmentAction } from './dto/respond-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { NotificationService } from '../notification/notification.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AppointmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly mailService: MailService
  ) {}

  /**
   * Create a new appointment (Client or Accountant)
   */
  async createAppointment(dto: CreateAppointmentDto, userId: number) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true, role: true },
      });

      const isAccountant = (user as any)?.role === 'ACCOUNTANT';

      // If slot provided — validate it's available and lock it
      if (dto.availabilitySlotId) {
        const slot = await this.prisma.availabilitySlot.findUnique({
          where: { id: dto.availabilitySlotId },
        });
        if (!slot) throw new ApiError('Slot introuvable', 404, 'SLOT_NOT_FOUND');
        if (slot.status !== 'available')
          throw new ApiError('Ce créneau est déjà pris', 409, 'SLOT_UNAVAILABLE');

        dto.date = slot.date.toISOString().split('T')[0];
        dto.hour = slot.startTime;
        if (!dto.accountantId) dto.accountantId = slot.accountantId;
      }

      // Validate that the date/hour is within the accountant's availability
      const targetAccountantId = isAccountant ? userId : dto.accountantId;
      if (targetAccountantId && dto.date && dto.hour) {
        const targetDate = new Date(dto.date);
        const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
        const dayName = dayNames[targetDate.getDay()];

        const matchingRule = await this.prisma.availability.findFirst({
          where: {
            accountantId: targetAccountantId,
            isActive: true,
            OR: [
              { isRecurring: true, dayOfWeek: dayName },
              { isRecurring: false, specificDate: targetDate },
            ],
          },
        });

        if (!matchingRule) {
          throw new ApiError(
            `Le comptable n'est pas disponible à cette date`,
            400,
            'ACCOUNTANT_NOT_AVAILABLE'
          );
        }

        const [ruleStartH, ruleStartM] = matchingRule.startTime.split(':').map(Number);
        const [ruleEndH, ruleEndM] = matchingRule.endTime.split(':').map(Number);
        const [hourH, hourM] = dto.hour.split(':').map(Number);
        const ruleStart = ruleStartH * 60 + ruleStartM;
        const ruleEnd = ruleEndH * 60 + ruleEndM;
        const apptHour = hourH * 60 + hourM;

        if (apptHour < ruleStart || apptHour >= ruleEnd) {
          throw new ApiError(
            `L'heure ${dto.hour} est hors des disponibilités du comptable (${matchingRule.startTime} - ${matchingRule.endTime})`,
            400,
            'HOUR_OUT_OF_AVAILABILITY'
          );
        }
      }

      const appointment = await this.prisma.appointment.create({
        data: {
          title: dto.title,
          description: dto.description,
          type: dto.type || 'meeting',
          date: new Date(dto.date),
          hour: dto.hour,
          meetingType: dto.meetingType || 'in_person',
          location: dto.location,
          clientId: dto.clientId,
          accountantId: isAccountant ? userId : (dto.accountantId ?? null),
          companyId: user?.companyId,
          clientNotes: dto.clientNotes,
          color: dto.color ?? null,
          guests: dto.guests ?? [],
        } as any,
        include: {
          client: {
            select: {
              id: true,
              username: true,
              email: true,
              firstName: true,
              lastName: true,
              photo: true,
            },
          },
          accountant: {
            select: {
              id: true,
              username: true,
              email: true,
              firstName: true,
              lastName: true,
              photo: true,
            },
          },
          company: { select: { id: true, name: true } },
        },
      });

      // Mark slot as booked
      if (dto.availabilitySlotId) {
        await this.prisma.availabilitySlot.update({
          where: { id: dto.availabilitySlotId },
          data: { status: 'booked', appointmentId: appointment.id },
        });
      }

      // Notify the other party
      const notifyId = isAccountant
        ? (appointment as any).clientId
        : (appointment as any).accountantId;
      if (notifyId) {
        this.notificationService
          .notify({
            recipientId: notifyId,
            type: 'appointment',
            action: 'created',
            actorName: isAccountant
              ? `${(appointment as any).accountant?.firstName ?? ''} ${(appointment as any).accountant?.lastName ?? ''}`.trim() ||
                'Votre comptable'
              : `${(appointment as any).client?.firstName ?? ''} ${(appointment as any).client?.lastName ?? ''}`.trim() ||
                'Un client',
            data: { appointmentId: appointment.id },
          })
          .catch(() => {});
      }

      // Send invitation emails to guests (fire-and-forget)
      if (dto.guests && dto.guests.length > 0) {
        const appt = appointment as any;
        const organizerUser = isAccountant ? appt.accountant : appt.client;
        const organizerName =
          `${organizerUser?.firstName ?? ''} ${organizerUser?.lastName ?? ''}`.trim() ||
          organizerUser?.username ||
          'Finora';

        for (const guestEmail of dto.guests) {
          this.mailService
            .sendAppointmentGuestInvitation({
              to: guestEmail,
              appointmentTitle: appointment.title,
              date: dto.date,
              hour: dto.hour,
              organizerName,
              location: appointment.location ?? undefined,
              meetingType: appointment.meetingType,
              description: appointment.description ?? undefined,
              color: dto.color ?? undefined,
            })
            .catch(() => {});
        }
      }

      return { success: true, message: 'Appointment created successfully', data: appointment };
    } catch (error) {
      console.error('Create appointment error:', error);
      throw error;
    }
  }

  /**
   * Get available (non-booked) slots for an accountant on a given date
   */
  async getAvailableSlots(accountantId: number, date: string) {
    const targetDate = new Date(date);
    const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const dayName = dayNames[targetDate.getDay()];

    // Get matching availability rules
    const rules = await this.prisma.availability.findMany({
      where: {
        accountantId,
        isActive: true,
        OR: [
          { isRecurring: true, dayOfWeek: dayName },
          { isRecurring: false, specificDate: targetDate },
        ],
      },
    });

    if (rules.length === 0) return { success: true, data: [] };

    // Get already booked slot times for this date
    const bookedSlots = await this.prisma.availabilitySlot.findMany({
      where: { accountantId, date: targetDate, status: 'booked' },
      select: { startTime: true },
    });
    const bookedTimes = new Set(bookedSlots.map((s: any) => s.startTime));

    // Generate available slots from rules, skip booked ones
    const slots: { startTime: string; endTime: string; availabilityId: number }[] = [];

    for (const rule of rules) {
      const [startH, startM] = rule.startTime.split(':').map(Number);
      const [endH, endM] = rule.endTime.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      for (let t = startMinutes; t + rule.slotDuration <= endMinutes; t += rule.slotDuration) {
        const slotStart = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
        const slotEnd = `${String(Math.floor((t + rule.slotDuration) / 60)).padStart(2, '0')}:${String((t + rule.slotDuration) % 60).padStart(2, '0')}`;

        if (bookedTimes.has(slotStart)) continue;

        slots.push({ startTime: slotStart, endTime: slotEnd, availabilityId: rule.id });
      }
    }

    return { success: true, data: slots };
  }

  /**
   * Get my appointments (Client)
   */
  async getMyAppointments(clientId: number, page: number = 1, limit: number = 10, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = { clientId };

    if (status) {
      where.status = status;
    }
    const [total, appointments] = await Promise.all([
      this.prisma.appointment.count({ where }),
      this.prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ date: 'asc' }, { hour: 'asc' }] as any,
        include: {
          accountant: {
            select: {
              id: true,
              username: true,
              email: true,
              firstName: true,
              lastName: true,
              photo: true,
            },
          },
        },
      }),
    ]);

    return {
      success: true,
      data: appointments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get all appointments (Accountant)
   */
  async getAllAppointments(
    accountantId: number,
    page: number = 1,
    limit: number = 10,
    status?: string
  ) {
    // Get accountant's company
    const accountant = await this.prisma.user.findUnique({
      where: { id: accountantId },
      select: { companyId: true },
    });

    if (!accountant?.companyId) {
      throw new ApiError('Accountant must belong to a company', 400, 'NO_COMPANY');
    }

    const skip = (page - 1) * limit;
    const where: any = { companyId: accountant.companyId };

    if (status) {
      where.status = status;
    }
    const [total, appointments] = await Promise.all([
      this.prisma.appointment.count({ where }),
      this.prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ date: 'asc' }, { hour: 'asc' }] as any,
        include: {
          client: {
            select: {
              id: true,
              username: true,
              email: true,
              firstName: true,
              lastName: true,
              photo: true,
            },
          },
          accountant: {
            select: {
              id: true,
              username: true,
              email: true,
              firstName: true,
              lastName: true,
              photo: true,
            },
          },
        },
      }),
    ]);

    // Count by status
    const statusCounts = await this.prisma.appointment.groupBy({
      by: ['status'],
      where: { companyId: accountant.companyId },
      _count: true,
    });

    const counts = {
      pending: 0,
      confirmed: 0,
      rescheduled: 0,
      rejected: 0,
      cancelled: 0,
      completed: 0,
    };

    statusCounts.forEach((item) => {
      counts[item.status] = item._count;
    });

    return {
      success: true,
      data: appointments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      counts,
    };
  }

  /**
   * Get appointment by ID
   */
  async getAppointmentById(appointmentId: number, userId: number) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        accountant: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new ApiError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }

    // Check access rights
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (
      appointment.clientId !== userId &&
      appointment.accountantId !== userId &&
      appointment.companyId !== user?.companyId
    ) {
      throw new ApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    return {
      success: true,
      data: appointment,
    };
  }

  /**
   * Update appointment
   */
  async updateAppointment(appointmentId: number, dto: UpdateAppointmentDto, userId: number) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new ApiError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }

    // Check access rights
    if (appointment.clientId !== userId && appointment.accountantId !== userId) {
      throw new ApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    const updatedAppointment = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type,
        date: dto.date ? new Date(dto.date) : undefined,
        hour: dto.hour,
        meetingType: dto.meetingType,
        location: dto.location,
        status: dto.status,
        clientNotes: dto.clientNotes,
        accountantNotes: dto.accountantNotes,
        color: dto.color,
        guests: dto.guests,
        cancelledAt: dto.status === AppointmentStatus.CANCELLED ? new Date() : undefined,
      } as any,
      include: {
        client: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            photo: true,
          },
        },
        accountant: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            photo: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Appointment updated successfully',
      data: updatedAppointment,
    };
  }

  /**
   * Respond to appointment (Accountant)
   */
  async respondToAppointment(
    appointmentId: number,
    dto: RespondAppointmentDto,
    accountantId: number
  ) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new ApiError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }

    if (appointment.status !== 'pending') {
      throw new ApiError('Can only respond to pending appointments', 400, 'INVALID_STATUS');
    }

    const isConfirmed = dto.action === AppointmentAction.CONFIRM;

    const updatedAppointment = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: isConfirmed ? 'confirmed' : 'rejected',
        accountantId: isConfirmed ? accountantId : appointment.accountantId,
        accountantNotes: dto.notes,
        rejectionReason: dto.rejectionReason,
        confirmedAt: isConfirmed ? new Date() : undefined,
      },
      include: {
        client: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            photo: true,
          },
        },
        accountant: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            photo: true,
          },
        },
      },
    });

    // Notify client about accountant's response
    this.notificationService
      .notify({
        recipientId: updatedAppointment.client.id,
        type: 'appointment',
        action: isConfirmed ? 'confirmed' : 'rejected',
        actorName: 'Votre comptable',
        data: { appointmentId },
      })
      .catch(() => {});

    return {
      success: true,
      message: isConfirmed ? 'Appointment confirmed successfully' : 'Appointment rejected',
      data: updatedAppointment,
    };
  }

  /**
   * Reschedule appointment
   */
  async rescheduleAppointment(
    appointmentId: number,
    dto: RescheduleAppointmentDto,
    userId: number
  ) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new ApiError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }

    // Check access rights
    if (appointment.clientId !== userId && appointment.accountantId !== userId) {
      throw new ApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Create new appointment with rescheduled status
    const newAppointment = await this.prisma.appointment.create({
      data: {
        title: appointment.title,
        description: appointment.description,
        type: appointment.type,
        date: new Date(dto.date),
        hour: dto.hour,
        meetingType: appointment.meetingType,
        location: appointment.location,
        clientId: appointment.clientId,
        accountantId: appointment.accountantId,
        companyId: appointment.companyId,
        status: 'pending',
        originalAppointmentId: appointment.id,
        clientNotes: appointment.clientNotes,
        accountantNotes: dto.reason,
        guests: (appointment as any).guests ?? [],
      } as any,
      include: {
        client: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            photo: true,
          },
        },
        accountant: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            photo: true,
          },
        },
      },
    });

    // Update original appointment status
    await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'rescheduled',
      },
    });

    // Notify the other party about rescheduling
    const recipientId =
      userId === appointment.clientId ? appointment.accountantId : appointment.clientId;
    if (recipientId) {
      this.notificationService
        .notify({
          recipientId,
          type: 'appointment',
          action: 'rescheduled',
          actorName: userId === appointment.clientId ? 'Le client' : 'Votre comptable',
          data: { appointmentId: newAppointment.id },
        })
        .catch(() => {});
    }

    return {
      success: true,
      message: 'Appointment rescheduled successfully',
      data: {
        originalAppointment: { id: appointment.id, status: 'rescheduled' },
        newAppointment,
      },
    };
  }

  /**
   * Cancel appointment
   */
  async cancelAppointment(appointmentId: number, userId: number) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new ApiError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }

    // Check access rights
    if (appointment.clientId !== userId && appointment.accountantId !== userId) {
      throw new ApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    const updatedAppointment = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
    });

    // Free the slot back to available if one was linked
    await this.prisma.availabilitySlot.updateMany({
      where: { appointmentId },
      data: { status: 'available', appointmentId: null },
    });

    // Notify the other party about cancellation
    const recipientId =
      userId === appointment.clientId ? appointment.accountantId : appointment.clientId;
    if (recipientId) {
      this.notificationService
        .notify({
          recipientId,
          type: 'appointment',
          action: 'cancelled',
          actorName: userId === appointment.clientId ? 'Le client' : 'Votre comptable',
          data: { appointmentId },
        })
        .catch(() => {});
    }

    return {
      success: true,
      message: 'Appointment cancelled successfully',
      data: updatedAppointment,
    };
  }
  async deleteAppointment(appointmentId: number, userId: number) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new ApiError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }

    // Only client can delete their own appointment
    if (appointment.clientId !== userId) {
      throw new ApiError('Only appointment creator can delete', 403, 'ACCESS_DENIED');
    }

    await this.prisma.appointment.delete({
      where: { id: appointmentId },
    });

    return {
      success: true,
      message: 'Appointment deleted successfully',
    };
  }

  // ─── AVAILABILITY ────────────────────────────────────────────────────────────

  /**
   * Create availability slot (Accountant)
   */
  async createAvailability(dto: CreateAvailabilityDto, accountantId: number) {
    const accountant = await this.prisma.user.findUnique({
      where: { id: accountantId },
      select: { companyId: true },
    });

    if (dto.isRecurring && dto.dayOfWeek === undefined) {
      throw new ApiError('dayOfWeek is required for recurring slots', 400, 'MISSING_DAY');
    }
    if (!dto.isRecurring && !dto.specificDate) {
      throw new ApiError('specificDate is required for one-off slots', 400, 'MISSING_DATE');
    }
    if (dto.startTime >= dto.endTime) {
      throw new ApiError('startTime must be before endTime', 400, 'INVALID_TIME');
    }

    const availability = await this.prisma.availability.create({
      data: {
        accountantId,
        companyId: accountant?.companyId,
        isRecurring: dto.isRecurring,
        dayOfWeek: (dto.isRecurring ? dto.dayOfWeek : null) as any,
        specificDate: !dto.isRecurring && dto.specificDate ? new Date(dto.specificDate) : null,
        startTime: dto.startTime,
        endTime: dto.endTime,
        slotDuration: dto.slotDuration ?? 60,
      },
    });

    return { success: true, message: 'Availability created', data: availability };
  }

  /**
   * Get my availabilities (Accountant)
   */
  async getMyAvailabilities(accountantId: number, onlyActive = true) {
    const where: any = { accountantId };
    if (onlyActive) where.isActive = true;

    const availabilities = await this.prisma.availability.findMany({
      where,
      orderBy: [
        { isRecurring: 'desc' },
        { dayOfWeek: 'asc' },
        { specificDate: 'asc' },
        { startTime: 'asc' },
      ],
    });

    return { success: true, data: availabilities };
  }

  /**
   * Get availabilities of an accountant (Client — to pick a slot)
   */
  async getAccountantAvailabilities(accountantId: number) {
    const availabilities = await this.prisma.availability.findMany({
      where: { accountantId, isActive: true },
      orderBy: [
        { isRecurring: 'desc' },
        { dayOfWeek: 'asc' },
        { specificDate: 'asc' },
        { startTime: 'asc' },
      ],
      select: {
        id: true,
        isRecurring: true,
        dayOfWeek: true,
        specificDate: true,
        startTime: true,
        endTime: true,
        slotDuration: true,
      },
    });

    return { success: true, data: availabilities };
  }

  /**
   * Update availability slot (Accountant)
   */
  async updateAvailability(
    availabilityId: number,
    dto: UpdateAvailabilityDto,
    accountantId: number
  ) {
    const slot = await this.prisma.availability.findUnique({ where: { id: availabilityId } });

    if (!slot) throw new ApiError('Availability not found', 404, 'NOT_FOUND');
    if (slot.accountantId !== accountantId)
      throw new ApiError('Access denied', 403, 'ACCESS_DENIED');

    const startTime = dto.startTime ?? slot.startTime;
    const endTime = dto.endTime ?? slot.endTime;
    if (startTime >= endTime) {
      throw new ApiError('startTime must be before endTime', 400, 'INVALID_TIME');
    }

    const updated = await this.prisma.availability.update({
      where: { id: availabilityId },
      data: {
        startTime: dto.startTime,
        endTime: dto.endTime,
        slotDuration: dto.slotDuration,
        isActive: dto.isActive,
      },
    });

    return { success: true, message: 'Availability updated', data: updated };
  }

  /**
   * Delete availability slot (Accountant)
   */
  async deleteAvailability(availabilityId: number, accountantId: number) {
    const slot = await this.prisma.availability.findUnique({ where: { id: availabilityId } });

    if (!slot) throw new ApiError('Availability not found', 404, 'NOT_FOUND');
    if (slot.accountantId !== accountantId)
      throw new ApiError('Access denied', 403, 'ACCESS_DENIED');

    await this.prisma.availability.delete({ where: { id: availabilityId } });

    return { success: true, message: 'Availability deleted' };
  }
}
