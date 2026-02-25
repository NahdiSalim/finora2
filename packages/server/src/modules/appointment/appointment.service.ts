import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApiError } from '../../common/errors/api-error';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto, AppointmentStatus } from './dto/update-appointment.dto';
import { RespondAppointmentDto, AppointmentAction } from './dto/respond-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';

@Injectable()
export class AppointmentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new appointment (Client)
   */
  async createAppointment(dto: CreateAppointmentDto, clientId: number) {
    try {
      // Get client's company
      const client = await this.prisma.user.findUnique({
        where: { id: clientId },
        select: { companyId: true },
      });

      // Calculate duration in minutes
      const start = new Date(dto.startTime);
      const end = new Date(dto.endTime);
      const duration = Math.round((end.getTime() - start.getTime()) / 60000);

      if (duration <= 0) {
        throw new ApiError('End time must be after start time', 400, 'INVALID_TIME');
      }

      // @ts-expect-error - Prisma types will be generated after running 'npx prisma generate'
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

      return {
        success: true,
        message: 'Appointment created successfully',
        data: appointment,
      };
    } catch (error) {
      console.error('Create appointment error:', error);
      throw error;
    }
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
      // @ts-expect-error - Prisma types not yet generated
      this.prisma.appointment.count({ where }),
      // @ts-expect-error - Prisma types not yet generated
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
      // @ts-expect-error - Prisma types not yet generated
      this.prisma.appointment.count({ where }),
      // @ts-expect-error - Prisma types not yet generated
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
    // @ts-expect-error - Prisma types will be generated after running 'npx prisma generate'
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
    // @ts-expect-error - Prisma types will be generated after running 'npx prisma generate'
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
    // @ts-expect-error - Prisma types will be generated after running 'npx prisma generate'
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

    // @ts-expect-error - Prisma types will be generated after running 'npx prisma generate'
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
    // @ts-expect-error - Prisma types will be generated after running 'npx prisma generate'
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

    // @ts-expect-error - Prisma types will be generated after running 'npx prisma generate'
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
    // @ts-expect-error - Prisma types will be generated after running 'npx prisma generate'
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
    // @ts-expect-error - Prisma types will be generated after running 'npx prisma generate'
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
    // @ts-expect-error - Prisma types will be generated after running 'npx prisma generate'
    await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'rescheduled',
      },
    });

    return {
      success: true,
      message: 'Appointment rescheduled successfully',
      data: {
        originalAppointment: {
          id: appointment.id,
          status: 'rescheduled',
        },
        newAppointment,
      },
    };
  }

  /**
   * Cancel appointment
   */
  async cancelAppointment(appointmentId: number, userId: number) {
    // @ts-expect-error - Prisma types will be generated after running 'npx prisma generate'
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

    // @ts-expect-error - Prisma types will be generated after running 'npx prisma generate'
    const updatedAppointment = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Appointment cancelled successfully',
      data: updatedAppointment,
    };
  }

  /**
   * Delete appointment
   */
  async deleteAppointment(appointmentId: number, userId: number) {
    // @ts-expect-error - Prisma types will be generated after running 'npx prisma generate'
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

    // @ts-expect-error - Prisma types will be generated after running 'npx prisma generate'
    await this.prisma.appointment.delete({
      where: { id: appointmentId },
    });

    return {
      success: true,
      message: 'Appointment deleted successfully',
    };
  }
}
