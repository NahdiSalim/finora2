import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { RespondAppointmentDto } from './dto/respond-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthRequest } from '../auth/types/user-type';

@ApiTags('appointments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@Controller('appointments')
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  /**
   * Create a new appointment (Client or Accountant)
   */
  @Post()
  @ApiOperation({ summary: 'Create a new appointment (client or accountant)' })
  @ApiResponse({ status: 201, description: 'Appointment created successfully' })
  async createAppointment(@Body() dto: CreateAppointmentDto, @Req() req: AuthRequest) {
    return this.appointmentService.createAppointment(dto, req.user!.id);
  }

  /**
   * Get my appointments (Client)
   */
  @Get('my-appointments')
  @UseGuards(RolesGuard)
  @Roles('CLIENT')
  @ApiOperation({ summary: '[Client] Get my appointments' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'confirmed', 'rescheduled', 'rejected', 'cancelled', 'completed'],
  })
  async getMyAppointments(
    @Req() req: AuthRequest,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string
  ) {
    const clientId = req.user!.id;
    return this.appointmentService.getMyAppointments(clientId, page || 1, limit || 10, status);
  }

  /**
   * Get all appointments (Accountant)
   */
  @Get('all')
  @UseGuards(RolesGuard)
  @Roles('ACCOUNTANT')
  @ApiOperation({ summary: '[Accountant] Get all appointment requests' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'confirmed', 'rescheduled', 'rejected', 'cancelled', 'completed'],
  })
  async getAllAppointments(
    @Req() req: AuthRequest,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string
  ) {
    const accountantId = req.user!.id;
    return this.appointmentService.getAllAppointments(accountantId, page || 1, limit || 10, status);
  }

  /**
   * Get appointment by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get appointment details by ID' })
  @ApiResponse({ status: 200, description: 'Appointment details' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  async getAppointmentById(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    const userId = req.user!.id;
    return this.appointmentService.getAppointmentById(id, userId);
  }

  /**
   * Update appointment
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update appointment' })
  @ApiResponse({ status: 200, description: 'Appointment updated successfully' })
  async updateAppointment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAppointmentDto,
    @Req() req: AuthRequest
  ) {
    const userId = req.user!.id;
    return this.appointmentService.updateAppointment(id, dto, userId);
  }

  /**
   * Respond to appointment (Accountant)
   */
  @Post(':id/respond')
  @UseGuards(RolesGuard)
  @Roles('ACCOUNTANT')
  @ApiOperation({ summary: '[Accountant] Confirm or reject appointment' })
  @ApiResponse({ status: 200, description: 'Response sent successfully' })
  async respondToAppointment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RespondAppointmentDto,
    @Req() req: AuthRequest
  ) {
    const accountantId = req.user!.id;
    return this.appointmentService.respondToAppointment(id, dto, accountantId);
  }

  /**
   * Reschedule appointment
   */
  @Post(':id/reschedule')
  @ApiOperation({ summary: 'Propose new time slots for appointment' })
  @ApiResponse({ status: 201, description: 'Appointment rescheduled successfully' })
  async rescheduleAppointment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RescheduleAppointmentDto,
    @Req() req: AuthRequest
  ) {
    const userId = req.user!.id;
    return this.appointmentService.rescheduleAppointment(id, dto, userId);
  }

  /**
   * Cancel appointment
   */
  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel appointment' })
  @ApiResponse({ status: 200, description: 'Appointment cancelled successfully' })
  async cancelAppointment(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    const userId = req.user!.id;
    return this.appointmentService.cancelAppointment(id, userId);
  }

  /**
   * Delete appointment (Client only)
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('CLIENT')
  @ApiOperation({ summary: '[Client] Delete appointment' })
  @ApiResponse({ status: 200, description: 'Appointment deleted successfully' })
  async deleteAppointment(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    const userId = req.user!.id;
    return this.appointmentService.deleteAppointment(id, userId);
  }

  // ─── AVAILABILITY ───────────────────────────────────────────────────────────

  /**
   * Create availability slot (Accountant)
   */
  @Post('availability')
  @UseGuards(RolesGuard)
  @Roles('ACCOUNTANT')
  @ApiOperation({ summary: '[Accountant] Add an availability slot' })
  async createAvailability(@Body() dto: CreateAvailabilityDto, @Req() req: AuthRequest) {
    return this.appointmentService.createAvailability(dto, req.user!.id);
  }

  /**
   * Get my availabilities (Accountant)
   */
  @Get('availability/mine')
  @UseGuards(RolesGuard)
  @Roles('ACCOUNTANT')
  @ApiOperation({ summary: '[Accountant] Get my availability slots' })
  @ApiQuery({ name: 'onlyActive', required: false, type: Boolean })
  async getMyAvailabilities(@Req() req: AuthRequest, @Query('onlyActive') onlyActive?: string) {
    return this.appointmentService.getMyAvailabilities(req.user!.id, onlyActive !== 'false');
  }

  /**
   * Get accountant availabilities (Client — to pick a slot)
   */
  @Get('availability/:accountantId')
  @ApiOperation({ summary: '[Client] Get availabilities of a specific accountant' })
  async getAccountantAvailabilities(@Param('accountantId', ParseIntPipe) accountantId: number) {
    return this.appointmentService.getAccountantAvailabilities(accountantId);
  }

  /**
   * Update availability slot (Accountant)
   */
  @Put('availability/:id')
  @UseGuards(RolesGuard)
  @Roles('ACCOUNTANT')
  @ApiOperation({ summary: '[Accountant] Update an availability slot' })
  async updateAvailability(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAvailabilityDto,
    @Req() req: AuthRequest
  ) {
    return this.appointmentService.updateAvailability(id, dto, req.user!.id);
  }

  /**
   * Delete availability slot (Accountant)
   */
  @Delete('availability/:id')
  @UseGuards(RolesGuard)
  @Roles('ACCOUNTANT')
  @ApiOperation({ summary: '[Accountant] Delete an availability slot' })
  async deleteAvailability(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.appointmentService.deleteAvailability(id, req.user!.id);
  }

  /**
   * Get available slots for an accountant on a given date (Client)
   */
  @Get('slots')
  @ApiOperation({
    summary: '[Client] Get available time slots for an accountant on a specific date',
  })
  @ApiQuery({ name: 'accountantId', required: true, type: Number, example: 2 })
  @ApiQuery({ name: 'date', required: true, type: String, example: '2026-04-28' })
  @ApiResponse({ status: 200, description: 'List of available slots' })
  async getAvailableSlots(
    @Query('accountantId', ParseIntPipe) accountantId: number,
    @Query('date') date: string
  ) {
    return this.appointmentService.getAvailableSlots(accountantId, date);
  }
}
