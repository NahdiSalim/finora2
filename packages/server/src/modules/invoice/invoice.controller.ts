import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Query,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthRequest } from '../auth/types/user-type';

@ApiTags('invoices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  /**
   * Create a new invoice (authenticated user)
   */
  @Post()
  @ApiOperation({ summary: 'Create a new invoice' })
  @ApiResponse({ status: 201, description: 'Invoice created successfully' })
  async create(@Body() dto: CreateInvoiceDto, @Req() req: AuthRequest) {
    return this.invoiceService.create(dto, req.user!.id);
  }

  @Post(':id/payments')
  @ApiOperation({ summary: 'Add a payment to an invoice' })
  @ApiResponse({ status: 201, description: 'Payment recorded, invoice totals updated' })
  @ApiResponse({ status: 400, description: 'Invoice is cancelled' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async addPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePaymentDto,
    @Req() req: AuthRequest
  ) {
    return this.invoiceService.addPayment(id, dto, req.user!.id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel an invoice' })
  @ApiResponse({ status: 200, description: 'Invoice cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Invoice already cancelled or paid' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async cancel(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.invoiceService.cancel(id, req.user!.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an invoice' })
  @ApiResponse({ status: 200, description: 'Invoice updated successfully' })
  @ApiResponse({ status: 400, description: 'Invoice is locked (paid or cancelled)' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInvoiceDto,
    @Req() req: AuthRequest
  ) {
    return this.invoiceService.update(id, dto, req.user!.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single invoice by id' })
  @ApiResponse({ status: 200, description: 'Invoice detail' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.invoiceService.findOne(id, req.user!.id);
  }

  @Get()
  @ApiOperation({ summary: 'List invoices for the authenticated user company' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Paginated invoice list' })
  async findAll(
    @Req() req: AuthRequest,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number
  ) {
    return this.invoiceService.findAll(
      req.user!.id,
      status,
      search,
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 10
    );
  }
}
