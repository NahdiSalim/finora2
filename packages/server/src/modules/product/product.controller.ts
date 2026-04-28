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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleCode } from 'src/common/enums/role.enum';
import type { AuthRequest } from '../auth/types/user-type';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@ApiTags('products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleCode.CLIENT)
@Controller('products')
@ApiBearerAuth('JWT-auth')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @ApiOperation({ summary: 'List products for the authenticated client' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getProducts(
    @Req() req: AuthRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string
  ) {
    const companyId = req.user!.companyId;
    if (!companyId)
      return { status: 'error', code: '400', message: 'User must belong to a company' };

    return this.productService.getProducts(
      companyId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
      search
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  async createProduct(@Req() req: AuthRequest, @Body() dto: CreateProductDto) {
    const companyId = req.user!.companyId;
    if (!companyId)
      return { status: 'error', code: '400', message: 'User must belong to a company' };

    return this.productService.createProduct(companyId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product' })
  async updateProduct(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto
  ) {
    const companyId = req.user!.companyId;
    if (!companyId)
      return { status: 'error', code: '400', message: 'User must belong to a company' };

    return this.productService.updateProduct(id, companyId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product' })
  async deleteProduct(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    const companyId = req.user!.companyId;
    if (!companyId)
      return { status: 'error', code: '400', message: 'User must belong to a company' };

    return this.productService.deleteProduct(id, companyId);
  }
}
