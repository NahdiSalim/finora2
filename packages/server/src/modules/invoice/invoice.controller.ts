import { Controller, Post, Get, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
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

  @Get()
  @ApiOperation({ summary: 'List invoices for the authenticated user company' })
  @ApiQuery({ name: 'status',   required: false, type: String })
  @ApiQuery({ name: 'search',   required: false, type: String })
  @ApiQuery({ name: 'page',     required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Paginated invoice list' })
  async findAll(
    @Req() req: AuthRequest,
    @Query('status')   status?: string,
    @Query('search')   search?: string,
    @Query('page')     page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.invoiceService.findAll(
      req.user!.id,
      status,
      search,
      page     ? Number(page)     : 1,
      pageSize ? Number(pageSize) : 10,
    );
  }
}
