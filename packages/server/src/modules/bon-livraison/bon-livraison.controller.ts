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
import { BonLivraisonService } from './bon-livraison.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import type { AuthRequest } from '../auth/types/user-type';
import { CreateBonLivraisonDto } from './dto/create-bon-livraison.dto';
import { UpdateBonLivraisonDto } from './dto/update-bon-livraison.dto';
import { ConvertBonLivraisonToInvoiceDto } from './dto/convert-bon-livraison-to-invoice.dto';

@ApiTags('bons-livraison')
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('bons-livraison')
@ApiBearerAuth('JWT-auth')
export class BonLivraisonController {
  constructor(private readonly service: BonLivraisonService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un bon de livraison' })
  async create(@Req() req: AuthRequest, @Body() dto: CreateBonLivraisonDto) {
    const { id: userId, companyId } = req.user!;
    if (!companyId)
      return { status: 'error', code: '400', message: 'User must belong to a company' };
    return this.service.create(userId, companyId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les bons de livraison' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async findAll(
    @Req() req: AuthRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const { companyId } = req.user!;
    if (!companyId)
      return { status: 'error', code: '400', message: 'User must belong to a company' };
    return this.service.findAll(
      companyId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      status,
      search,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtenir un bon de livraison' })
  async findOne(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    const { companyId } = req.user!;
    if (!companyId)
      return { status: 'error', code: '400', message: 'User must belong to a company' };
    return this.service.findOne(id, companyId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Mettre à jour un bon de livraison' })
  async update(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBonLivraisonDto
  ) {
    const { companyId } = req.user!;
    if (!companyId)
      return { status: 'error', code: '400', message: 'User must belong to a company' };
    return this.service.update(id, companyId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un bon de livraison' })
  async remove(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    const { companyId } = req.user!;
    if (!companyId)
      return { status: 'error', code: '400', message: 'User must belong to a company' };
    return this.service.remove(id, companyId);
  }

  @Post(':id/convert-to-invoice')
  @ApiOperation({ summary: 'Convertir un bon de livraison en facture brouillon' })
  async convertToInvoice(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConvertBonLivraisonToInvoiceDto
  ) {
    const { id: userId, companyId } = req.user!;
    if (!companyId)
      return { status: 'error', code: '400', message: 'User must belong to a company' };
    return this.service.convertBonLivraisonToInvoice(id, userId, companyId, dto);
  }
}
