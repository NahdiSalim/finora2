import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApiError } from '../../common/errors/api-error';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto, AppointmentStatus } from './dto/update-appointment.dto';
import { RespondAppointmentDto, AppointmentAction } from './dto/respond-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { ReportAppointmentDto } from './dto/report-appointment.dto';
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
          accountantId: dto.accountantId,
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
   * Also excludes dates that fall within a leave period
   */
  async getAvailableSlots(accountantId: number, date: string) {
    // Normalize date to avoid timezone issues — use start of day UTC
    const [year, month, day] = date.split('-').map(Number);
    const targetDate = new Date(Date.UTC(year, month - 1, day));

    const now = new Date();
    const isToday =
      now.getFullYear() === year && now.getMonth() + 1 === month && now.getDate() === day;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Check if date is within a leave period
    const leave = await this.prisma.accountantLeave.findFirst({
      where: {
        accountantId,
        startDate: { lte: targetDate },
        endDate: { gte: targetDate },
      },
    });
    if (leave) return { success: true, data: [], leaveReason: leave.reason ?? 'Congé' };

    const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    // Use local day of week based on the date string directly
    const jsDate = new Date(year, month - 1, day);
    const dayName = dayNames[jsDate.getDay()];

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

    // Get booked hours from appointments (non-cancelled/rejected) for this date
    const bookedAppointments = await this.prisma.appointment.findMany({
      where: {
        accountantId,
        date: targetDate,
        status: { notIn: ['cancelled', 'rejected'] },
      },
      select: { hour: true },
    });
    const bookedTimes = new Set(bookedAppointments.map((a: any) => a.hour));

    // Generate available slots — skip booked and past slots (if today)
    const slots: { startTime: string; endTime: string; availabilityId: number }[] = [];

    for (const rule of rules) {
      const [startH, startM] = rule.startTime.split(':').map(Number);
      const [endH, endM] = rule.endTime.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      for (let t = startMinutes; t + rule.slotDuration <= endMinutes; t += rule.slotDuration) {
        const slotStart = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
        const slotEnd = `${String(Math.floor((t + rule.slotDuration) / 60)).padStart(2, '0')}:${String((t + rule.slotDuration) % 60).padStart(2, '0')}`;

        // Skip if already booked by an appointment
        if (bookedTimes.has(slotStart)) continue;

        // Skip past slots if querying today
        if (isToday && t < currentMinutes) continue;

        slots.push({ startTime: slotStart, endTime: slotEnd, availabilityId: rule.id });
      }
    }

    return { success: true, data: slots };
  }

  /**
   * Get my appointments (Client)
   */
  async getMyAppointments(
    clientId: number,
    page: number = 1,
    limit: number = 10,
    status?: string,
    period?: string, // 'today' | 'upcoming' | 'past'
    search?: string
  ) {
    const skip = (page - 1) * limit;
    const where: any = { clientId };

    if (status) where.status = status;
    this.applyPeriodFilter(where, period);
    this.applySearchFilter(where, search);

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
          reports: { select: { id: true } },
        },
      }),
    ]);

    return {
      success: true,
      data: appointments.map((a) => ({
        ...a,
        reported: (a.reports as any[]).length > 0,
        reports: undefined,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get all appointments (Accountant)
   */
  async getAllAppointments(
    accountantId: number,
    page: number = 1,
    limit: number = 10,
    status?: string,
    period?: string, // 'today' | 'upcoming' | 'past'
    search?: string
  ) {
    const accountant = await this.prisma.user.findUnique({
      where: { id: accountantId },
      select: { companyId: true },
    });

    if (!accountant?.companyId) {
      throw new ApiError('Accountant must belong to a company', 400, 'NO_COMPANY');
    }

    const skip = (page - 1) * limit;
    const where: any = { companyId: accountant.companyId };

    if (status) where.status = status;
    this.applyPeriodFilter(where, period);
    this.applySearchFilter(where, search);

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
          reports: { select: { id: true } },
        },
      }),
    ]);

    const statusCounts = await this.prisma.appointment.groupBy({
      by: ['status'],
      where: { companyId: accountant.companyId },
      _count: true,
    });

    const counts: Record<string, number> = {
      pending: 0,
      confirmed: 0,
      rescheduled: 0,
      rejected: 0,
      cancelled: 0,
      completed: 0,
    };
    statusCounts.forEach((item: any) => {
      counts[item.status] = item._count;
    });

    return {
      success: true,
      data: appointments.map((a) => ({
        ...a,
        reported: (a.reports as any[]).length > 0,
        reports: undefined,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
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
    if (updatedAppointment.client?.id) {
      this.notificationService
        .notify({
          recipientId: updatedAppointment.client.id,
          type: 'appointment',
          action: isConfirmed ? 'confirmed' : 'rejected',
          actorName: 'Votre comptable',
          data: { appointmentId },
        })
        .catch(() => {});
    }

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

  async getConfirmedThisMonth(userId: number) {
    const now = new Date();
    const start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    const end = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0));

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    const isAccountant = (user as any)?.role === 'ACCOUNTANT';

    const where: any = {
      status: 'confirmed',
      date: { gte: start, lte: end },
    };
    if (isAccountant) where.accountantId = userId;
    else where.clientId = userId;

    const appointments = await this.prisma.appointment.findMany({
      where,
      orderBy: [{ date: 'asc' }, { hour: 'asc' }] as any,
      select: {
        id: true,
        title: true,
        date: true,
        hour: true,
        meetingType: true,
        location: true,
        color: true,
        client: { select: { id: true, firstName: true, lastName: true, photo: true } },
        accountant: { select: { id: true, firstName: true, lastName: true, photo: true } },
      },
    });

    return { success: true, data: appointments };
  }

  async createLeave(dto: CreateLeaveDto, accountantId: number) {
    if (dto.startDate > dto.endDate)
      throw new ApiError('startDate doit être avant endDate', 400, 'INVALID_DATE_RANGE');

    const leave = await this.prisma.accountantLeave.create({
      data: {
        accountantId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        reason: dto.reason,
      },
    });
    return { success: true, message: 'Congé créé', data: leave };
  }

  async getMyLeaves(accountantId: number) {
    const leaves = await this.prisma.accountantLeave.findMany({
      where: { accountantId },
      orderBy: { startDate: 'asc' },
    });
    return { success: true, data: leaves };
  }

  async deleteLeave(leaveId: number, accountantId: number) {
    const leave = await this.prisma.accountantLeave.findUnique({ where: { id: leaveId } });
    if (!leave) throw new ApiError('Congé introuvable', 404, 'NOT_FOUND');
    if (leave.accountantId !== accountantId)
      throw new ApiError('Access denied', 403, 'ACCESS_DENIED');
    await this.prisma.accountantLeave.delete({ where: { id: leaveId } });
    return { success: true, message: 'Congé supprimé' };
  }

  // ─── REPORT (REPORTER UN RDV) ─────────────────────────────────────────────

  async reportAppointment(appointmentId: number, dto: ReportAppointmentDto, userId: number) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appointment) throw new ApiError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    if (appointment.clientId !== userId && appointment.accountantId !== userId)
      throw new ApiError('Access denied', 403, 'ACCESS_DENIED');

    // Save report history
    await this.prisma.appointmentReport.create({
      data: {
        appointmentId,
        reportedById: userId,
        oldDate: (appointment as any).date,
        oldHour: (appointment as any).hour,
        newDate: new Date(dto.newDate),
        newHour: dto.newHour,
        reason: dto.reason,
      },
    });

    // Update appointment date/hour
    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { date: new Date(dto.newDate), hour: dto.newHour } as any,
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
        reports: { select: { id: true } },
      },
    });

    // Notify the other party
    const recipientId =
      userId === appointment.clientId ? appointment.accountantId : appointment.clientId;
    if (recipientId) {
      this.notificationService
        .notify({
          recipientId,
          type: 'appointment',
          action: 'rescheduled',
          actorName: userId === appointment.clientId ? 'Le client' : 'Votre comptable',
          data: { appointmentId },
        })
        .catch(() => {});
    }

    return {
      success: true,
      message: 'Rendez-vous reporté',
      data: { ...(updated as any), reported: true, reports: undefined },
    };
  }

  async getAppointmentHistory(appointmentId: number, userId: number) {
    const appointment = await this.prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment) throw new ApiError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    if (appointment.clientId !== userId && appointment.accountantId !== userId)
      throw new ApiError('Access denied', 403, 'ACCESS_DENIED');

    const history = await this.prisma.appointmentReport.findMany({
      where: { appointmentId },
      orderBy: { createdAt: 'asc' },
      include: {
        reportedBy: {
          select: { id: true, username: true, firstName: true, lastName: true, photo: true },
        },
      },
    });

    return { success: true, data: history };
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────────

  private applyPeriodFilter(where: any, period?: string) {
    if (!period) return;

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();

    // Build UTC boundaries to match @db.Date storage
    const todayStart = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
    const todayEnd = new Date(Date.UTC(y, m, d, 23, 59, 59, 999));
    const tomorrowStart = new Date(Date.UTC(y, m, d + 1, 0, 0, 0, 0));

    const currentHour = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (period === 'today') {
      where.date = { gte: todayStart, lte: todayEnd };
    } else if (period === 'upcoming') {
      where.OR = [
        { date: { gte: tomorrowStart } },
        { date: { gte: todayStart, lte: todayEnd }, hour: { gt: currentHour } },
      ];
    } else if (period === 'past') {
      where.OR = [
        { date: { lt: todayStart } },
        { date: { gte: todayStart, lte: todayEnd }, hour: { lt: currentHour } },
      ];
    }
  }

  private applySearchFilter(where: any, search?: string) {
    if (!search) return;
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      {
        client: {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { username: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        },
      },
      {
        accountant: {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { username: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        },
      },
    ];
  }
}
