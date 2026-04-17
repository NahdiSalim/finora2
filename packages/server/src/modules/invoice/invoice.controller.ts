import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InvoiceService } from './invoice.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import type { AuthRequest } from '../auth/types/user-type';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

@ApiTags('invoices')
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('invoices')
@ApiBearerAuth('JWT-auth')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new invoice' })
  async createInvoice(@Req() req: AuthRequest, @Body() dto: CreateInvoiceDto) {
    const userId = req.user!.id;
    const userCompanyId = req.user!.companyId;
    if (!userCompanyId)
      return { status: 'error', code: '400', message: 'User must belong to a company' };
    return this.invoiceService.createInvoice(userId, userCompanyId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all invoices with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getInvoicesList(
    @Req() req: AuthRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const userCompanyId = req.user!.companyId;
    if (!userCompanyId)
      return { status: 'error', code: '400', message: 'User must belong to a company' };
    return this.invoiceService.getInvoicesList(
      userCompanyId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      status,
      search,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  async getInvoice(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    const userCompanyId = req.user!.companyId;
    if (!userCompanyId)
      return { status: 'error', code: '400', message: 'User must belong to a company' };
    return this.invoiceService.getInvoice(id, userCompanyId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update invoice' })
  async updateInvoice(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInvoiceDto
  ) {
    const userCompanyId = req.user!.companyId;
    if (!userCompanyId)
      return { status: 'error', code: '400', message: 'User must belong to a company' };
    return this.invoiceService.updateInvoice(id, userCompanyId, dto);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish a draft invoice (change status)' })
  async publishInvoice(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body('status') newStatus: string
  ) {
    const userCompanyId = req.user!.companyId;
    if (!userCompanyId)
      return { status: 'error', code: '400', message: 'User must belong to a company' };
    return this.invoiceService.publishInvoice(id, userCompanyId, newStatus);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete invoice' })
  async deleteInvoice(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    const userCompanyId = req.user!.companyId;
    if (!userCompanyId)
      return { status: 'error', code: '400', message: 'User must belong to a company' };
    return this.invoiceService.deleteInvoice(id, userCompanyId);
  }
}
