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
import { CreateLeaveDto } from './dto/create-leave.dto';
import { ReportAppointmentDto } from './dto/report-appointment.dto';
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
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'confirmed', 'rescheduled', 'rejected', 'cancelled', 'completed'],
  })
  @ApiQuery({ name: 'period', required: false, enum: ['today', 'upcoming', 'past'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getMyAppointments(
    @Req() req: AuthRequest,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('period') period?: string,
    @Query('search') search?: string
  ) {
    return this.appointmentService.getMyAppointments(
      req.user!.id,
      page || 1,
      limit || 10,
      status,
      period,
      search
    );
  }

  /**
   * Get all appointments (Accountant)
   */
  @Get('all')
  @UseGuards(RolesGuard)
  @Roles('ACCOUNTANT')
  @ApiOperation({ summary: '[Accountant] Get all appointment requests' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'confirmed', 'rescheduled', 'rejected', 'cancelled', 'completed'],
  })
  @ApiQuery({ name: 'period', required: false, enum: ['today', 'upcoming', 'past'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getAllAppointments(
    @Req() req: AuthRequest,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('period') period?: string,
    @Query('search') search?: string
  ) {
    return this.appointmentService.getAllAppointments(
      req.user!.id,
      page || 1,
      limit || 10,
      status,
      period,
      search
    );
  }

  /**
   * Get my relations — accountant gets his clients, client gets his accountants
   */
  @Get('relations/mine')
  @ApiOperation({
    summary: 'Retourne les comptables (si client) ou les clients (si comptable) en relation active',
  })
  async getMyRelations(@Req() req: AuthRequest) {
    return this.appointmentService.getMyRelations(req.user!.id);
  }

  /**
   * Get confirmed appointments for current month
   */
  @Get('confirmed/this-month')
  @ApiOperation({ summary: 'Rendez-vous confirmés du mois actuel (date, heure, titre)' })
  async getConfirmedThisMonth(@Req() req: AuthRequest) {
    return this.appointmentService.getConfirmedThisMonth(req.user!.id);
  }

  /**
   * Get all slots for an accountant on a given date (available + booked)
   */
  @Get('slots/available')
  @ApiOperation({
    summary: 'Get all time slots for an accountant on a specific date (excludes booked)',
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

  /**
   * Get chat-accessible appointments by client ID (for messagerie attachments)
   */
  @Get('chat-accessible/:clientId')
  @UseGuards(RolesGuard)
  @Roles('ACCOUNTANT', 'COLLABORATEUR', 'COLLABORATOR')
  @ApiOperation({ summary: '[Accountant] Get appointments for a client (chat attachments)' })
  @ApiQuery({ name: 'page', required: false, type: 'number' })
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  @ApiResponse({ status: 200, description: 'Paginated list of client appointments' })
  async getChatAccessibleAppointments(
    @Param('clientId', ParseIntPipe) clientId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Req() req?: AuthRequest
  ) {
    const accountantId = req!.user!.id;
    const raw = await this.appointmentService.getChatAccessibleAppointmentsByClient(
      clientId,
      accountantId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 5
    );
    // Map date + hour → startTime / endTime (ISO strings) expected by the frontend
    return {
      ...raw,
      data: raw.data.map((a: any) => {
        const dateStr = new Date(a.date).toISOString().slice(0, 10);
        const [h, m] = (a.hour as string).split(':').map(Number);
        const pad = (n: number) => String(n).padStart(2, '0');
        const startTime = `${dateStr}T${pad(h)}:${pad(m)}:00.000Z`;
        const endTime = `${dateStr}T${pad((h + 1) % 24)}:${pad(m)}:00.000Z`;
        return { id: a.id, title: a.title, startTime, endTime, status: a.status, type: a.type };
      }),
    };
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
   * Respond to appointment (Accountant or Client)
   */
  @Post(':id/respond')
  @ApiOperation({ summary: 'Confirm or reject an appointment (accountant or client)' })
  async respondToAppointment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RespondAppointmentDto,
    @Req() req: AuthRequest
  ) {
    return this.appointmentService.respondToAppointment(id, dto, req.user!.id);
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

  /**
   * Report (reporter) an appointment — both client and accountant can do it
   */
  @Post(':id/report')
  @ApiOperation({ summary: 'Reporter un rendez-vous à une nouvelle date/heure' })
  async reportAppointment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReportAppointmentDto,
    @Req() req: AuthRequest
  ) {
    return this.appointmentService.reportAppointment(id, dto, req.user!.id);
  }

  /**
   * Get report history of an appointment
   */
  @Get(':id/history')
  @ApiOperation({ summary: "Historique des reports d'un rendez-vous" })
  async getAppointmentHistory(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.appointmentService.getAppointmentHistory(id, req.user!.id);
  }

  // ─── CONGÉS ─────────────────────────────────────────────────────────────────

  /**
   * Create a leave period (Accountant)
   */
  @Post('leaves')
  @UseGuards(RolesGuard)
  @Roles('ACCOUNTANT')
  @ApiOperation({ summary: '[Accountant] Déclarer une période de congé' })
  async createLeave(@Body() dto: CreateLeaveDto, @Req() req: AuthRequest) {
    return this.appointmentService.createLeave(dto, req.user!.id);
  }

  /**
   * Get my leaves (Accountant)
   */
  @Get('leaves/mine')
  @UseGuards(RolesGuard)
  @Roles('ACCOUNTANT')
  @ApiOperation({ summary: '[Accountant] Voir mes congés' })
  async getMyLeaves(@Req() req: AuthRequest) {
    return this.appointmentService.getMyLeaves(req.user!.id);
  }

  /**
   * Delete a leave (Accountant)
   */
  @Delete('leaves/:id')
  @UseGuards(RolesGuard)
  @Roles('ACCOUNTANT')
  @ApiOperation({ summary: '[Accountant] Supprimer un congé' })
  async deleteLeave(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.appointmentService.deleteLeave(id, req.user!.id);
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
}
