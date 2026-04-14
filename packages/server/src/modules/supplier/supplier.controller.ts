import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { SupplierService } from './supplier.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleCode } from 'src/common/enums/role.enum';
import type { AuthRequest } from '../auth/types/user-type';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@ApiTags('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleCode.CLIENT)
@Controller('suppliers')
@ApiBearerAuth('JWT-auth')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  /**
   * GET /suppliers — list all suppliers for the authenticated client company
   */
  @Get()
  @ApiOperation({ summary: 'List suppliers for the authenticated client' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getSuppliers(
    @Req() req: AuthRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string
  ) {
    const companyId = req.user!.companyId;

    if (!companyId) {
      return {
        status: 'error',
        code: '400',
        message: 'User must belong to a company',
      };
    }

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    return this.supplierService.getSuppliers(companyId, pageNum, limitNum, search);
  }

  /**
   * POST /suppliers — create a new supplier (with optional logo upload)
   */
  @Post()
  @ApiOperation({ summary: 'Create a new supplier' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('logo'))
  async createSupplier(
    @Req() req: AuthRequest,
    @Body() dto: CreateSupplierDto,
    @UploadedFile() logo?: Express.Multer.File
  ) {
    const companyId = req.user!.companyId;

    if (!companyId) {
      return {
        status: 'error',
        code: '400',
        message: 'User must belong to a company',
      };
    }

    return this.supplierService.createSupplier(companyId, dto, logo);
  }

  /**
   * PATCH /suppliers/:id — update an existing supplier
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a supplier' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('logo'))
  async updateSupplier(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSupplierDto,
    @UploadedFile() logo?: Express.Multer.File
  ) {
    const companyId = req.user!.companyId;

    if (!companyId) {
      return {
        status: 'error',
        code: '400',
        message: 'User must belong to a company',
      };
    }

    return this.supplierService.updateSupplier(id, companyId, dto, logo);
  }

  /**
   * DELETE /suppliers/:id — delete a supplier
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a supplier' })
  async deleteSupplier(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    const companyId = req.user!.companyId;

    if (!companyId) {
      return {
        status: 'error',
        code: '400',
        message: 'User must belong to a company',
      };
    }

    return this.supplierService.deleteSupplier(id, companyId);
  }
}
