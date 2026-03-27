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

@Injectable()
export class AppointmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService
  ) {}

  /**
   * Create a new appointment (Client)
   */
  async createAppointment(dto: CreateAppointmentDto, clientId: number) {
    try {
      const client = await this.prisma.user.findUnique({
        where: { id: clientId },
        select: { companyId: true },
      });

      // If slot provided — validate it's available and lock it
      if (dto.availabilitySlotId) {
        const slot = await this.prisma.availabilitySlot.findUnique({
          where: { id: dto.availabilitySlotId },
        });
        if (!slot) throw new ApiError('Slot introuvable', 404, 'SLOT_NOT_FOUND');
        if (slot.status !== 'available')
          throw new ApiError('Ce créneau est déjà pris', 409, 'SLOT_UNAVAILABLE');

        // Use slot times
        dto.startTime = `${slot.date.toISOString().split('T')[0]}T${slot.startTime}:00.000Z`;
        dto.endTime = `${slot.date.toISOString().split('T')[0]}T${slot.endTime}:00.000Z`;
        if (!dto.accountantId) dto.accountantId = slot.accountantId;
      }

      const start = new Date(dto.startTime);
      const end = new Date(dto.endTime);
      const duration = Math.round((end.getTime() - start.getTime()) / 60000);

      if (duration <= 0)
        throw new ApiError('End time must be after start time', 400, 'INVALID_TIME');

      const appointment = await this.prisma.appointment.create({
        data: {
          title: dto.title,
          description: dto.description,
          type: dto.type || 'meeting',
          startTime: start,
          endTime: end,
          duration,
          meetingType: dto.meetingType || 'in_person',
          location: dto.location,
          clientId,
          accountantId: dto.accountantId,
          companyId: client?.companyId,
          clientNotes: dto.clientNotes,
        },
        include: {
          client: {
            select: { id: true, username: true, email: true, firstName: true, lastName: true },
          },
          accountant: {
            select: { id: true, username: true, email: true, firstName: true, lastName: true },
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

      if (dto.accountantId) {
        const clientUser = await this.prisma.user.findUnique({
          where: { id: clientId },
          select: { firstName: true, lastName: true },
        });
        this.notificationService
          .notify({
            recipientId: dto.accountantId,
            type: 'appointment',
            action: 'created',
            actorName: clientUser ? `${clientUser.firstName} ${clientUser.lastName}` : 'Un client',
            data: { appointmentId: appointment.id },
          })
          .catch(() => {});
      }

      return { success: true, message: 'Appointment created successfully', data: appointment };
    } catch (error) {
      console.error('Create appointment error:', error);
      throw error;
    }
  }

  /**
   * Get available slots for an accountant on a given date (Client)
   * Generates slots from Availability rules, excludes already booked ones
   */
  async getAvailableSlots(accountantId: number, date: string) {
    const targetDate = new Date(date);
    const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const dayName = dayNames[targetDate.getDay()];

    // Get matching availability rules (recurring for this day OR specific date)
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

    // Get already booked slots for this date
    const bookedSlots = await this.prisma.availabilitySlot.findMany({
      where: { accountantId, date: targetDate, status: 'booked' },
      select: { startTime: true },
    });
    const bookedTimes = new Set(bookedSlots.map((s) => s.startTime));

    // Generate slots from rules
    const slots: any[] = [];
    for (const rule of rules) {
      const [startH, startM] = rule.startTime.split(':').map(Number);
      const [endH, endM] = rule.endTime.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      for (let t = startMinutes; t + rule.slotDuration <= endMinutes; t += rule.slotDuration) {
        const slotStart = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
        const slotEnd = `${String(Math.floor((t + rule.slotDuration) / 60)).padStart(2, '0')}:${String((t + rule.slotDuration) % 60).padStart(2, '0')}`;

        if (bookedTimes.has(slotStart)) continue; // already booked

        // Upsert slot in DB (create if not exists)
        const slot = await this.prisma.availabilitySlot.upsert({
          where: {
            accountantId_date_startTime: { accountantId, date: targetDate, startTime: slotStart },
          },
          update: {},
          create: {
            availabilityId: rule.id,
            accountantId,
            date: targetDate,
            startTime: slotStart,
            endTime: slotEnd,
            status: 'available',
          },
        });

        slots.push(slot);
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
        orderBy: {
          startTime: 'asc',
        },
        include: {
          accountant: {
            select: {
              id: true,
              username: true,
              email: true,
              firstName: true,
              lastName: true,
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
        orderBy: {
          startTime: 'asc',
        },
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

    // Calculate new duration if times are updated
    let duration = appointment.duration;
    if (dto.startTime && dto.endTime) {
      const start = new Date(dto.startTime);
      const end = new Date(dto.endTime);
      duration = Math.round((end.getTime() - start.getTime()) / 60000);

      if (duration <= 0) {
        throw new ApiError('End time must be after start time', 400, 'INVALID_TIME');
      }
    }

    const updatedAppointment = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type,
        startTime: dto.startTime ? new Date(dto.startTime) : undefined,
        endTime: dto.endTime ? new Date(dto.endTime) : undefined,
        duration,
        meetingType: dto.meetingType,
        location: dto.location,
        status: dto.status,
        clientNotes: dto.clientNotes,
        accountantNotes: dto.accountantNotes,
        cancelledAt: dto.status === AppointmentStatus.CANCELLED ? new Date() : undefined,
      },
      include: {
        client: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        accountant: {
          select: {
            id: true,
            username: true,
            email: true,
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
          },
        },
        accountant: {
          select: {
            id: true,
            username: true,
            email: true,
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

    // Calculate new duration
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    const duration = Math.round((end.getTime() - start.getTime()) / 60000);

    if (duration <= 0) {
      throw new ApiError('End time must be after start time', 400, 'INVALID_TIME');
    }

    // Create new appointment with rescheduled status
    const newAppointment = await this.prisma.appointment.create({
      data: {
        title: appointment.title,
        description: appointment.description,
        type: appointment.type,
        startTime: start,
        endTime: end,
        duration,
        meetingType: appointment.meetingType,
        location: appointment.location,
        clientId: appointment.clientId,
        accountantId: appointment.accountantId,
        companyId: appointment.companyId,
        status: 'pending',
        originalAppointmentId: appointment.id,
        clientNotes: appointment.clientNotes,
        accountantNotes: dto.reason,
      },
      include: {
        client: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        accountant: {
          select: {
            id: true,
            username: true,
            email: true,
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
   * Get chat-accessible appointments for a client (for messagerie attachments)
   */
  async getChatAccessibleAppointmentsByClient(
    clientId: number,
    accountantId: number,
    page: number = 1,
    limit: number = 5
  ) {
    // Verify accountant has access
    const accountant = await this.prisma.user.findUnique({
      where: { id: accountantId },
      select: { companyId: true },
    });

    if (!accountant?.companyId) {
      throw new ApiError(
        'Accountant not found or not associated with a company',
        403,
        'ACCESS_DENIED'
      );
    }

    // Verify client exists
    const client = await this.prisma.user.findUnique({
      where: { id: clientId },
      select: { id: true },
    });

    if (!client) {
      throw new ApiError('Client not found', 404, 'CLIENT_NOT_FOUND');
    }

    // For appointments, filter by clientId and verify the accountant belongs to the same company
    // Appointments link client to accountant, and accountant should be from the same company
    const where: any = {
      clientId,
      status: { notIn: ['cancelled', 'rejected'] },
      OR: [
        { accountantId },
        {
          accountant: {
            companyId: accountant.companyId,
          },
        },
        { accountantId: null },
      ],
    };

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
          status: true,
          type: true,
          meetingType: true,
          createdAt: true,
        },
        orderBy: { startTime: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.appointment.count({ where }),
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
