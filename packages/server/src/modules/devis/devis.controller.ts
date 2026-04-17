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
  Res,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { DevisService } from './devis.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import type { AuthRequest } from '../auth/types/user-type';
import { CreateDevisDto } from './dto/create-devis.dto';
import { UpdateDevisDto } from './dto/update-devis.dto';

@ApiTags('devis')
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('devis')
@ApiBearerAuth('JWT-auth')
export class DevisController {
  constructor(private readonly devisService: DevisService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new devis' })
  async createDevis(@Req() req: AuthRequest, @Body() dto: CreateDevisDto) {
    const userId = req.user!.id;
    const userCompanyId = req.user!.companyId;

    if (!userCompanyId) {
      return {
        status: 'error',
        code: '400',
        message: 'User must belong to a company',
      };
    }

    return this.devisService.createDevis(userId, userCompanyId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all devis with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    enum: ['en_attente', 'accepte', 'refuse'],
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getDevisList(
    @Req() req: AuthRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const userCompanyId = req.user!.companyId;

    if (!userCompanyId) {
      return {
        status: 'error',
        code: '400',
        message: 'User must belong to a company',
      };
    }

    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 10;
    const startDateObj = startDate ? new Date(startDate) : undefined;
    const endDateObj = endDate ? new Date(endDate) : undefined;

    return this.devisService.getDevisList(
      userCompanyId,
      pageNum,
      limitNum,
      status,
      search,
      startDateObj,
      endDateObj
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get devis by ID' })
  async getDevis(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    const userCompanyId = req.user!.companyId;

    if (!userCompanyId) {
      return {
        status: 'error',
        code: '400',
        message: 'User must belong to a company',
      };
    }

    return this.devisService.getDevis(id, userCompanyId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update devis' })
  async updateDevis(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDevisDto
  ) {
    const userCompanyId = req.user!.companyId;

    if (!userCompanyId) {
      return {
        status: 'error',
        code: '400',
        message: 'User must belong to a company',
      };
    }

    return this.devisService.updateDevis(id, userCompanyId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete devis' })
  async deleteDevis(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    const userCompanyId = req.user!.companyId;

    if (!userCompanyId) {
      return {
        status: 'error',
        code: '400',
        message: 'User must belong to a company',
      };
    }

    return this.devisService.deleteDevis(id, userCompanyId);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download devis PDF' })
  async downloadDevisPdf(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response
  ) {
    const userCompanyId = req.user!.companyId;

    if (!userCompanyId) {
      return res.status(400).json({
        status: 'error',
        code: '400',
        message: 'User must belong to a company',
      });
    }

    const { stream, filename, mimeType } = await this.devisService.downloadDevisPdf(
      id,
      userCompanyId
    );

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    stream.pipe(res);
  }
}
