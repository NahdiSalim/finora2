import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';

import {
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProfileComparisonsService } from './profile-comparisons.service';
import type { Response } from 'express';
import { CompareProfilesDto } from './dto/compare-profiles.dto';
import { PreComparaisonDto } from './dto/pre-comparaison.dto';
import { JwtAuthGuard } from '../auth/guards';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { ProfileComparisonResponseDto } from './dto/profile-comparison-response.dto';

@ApiTags('Profile Comparisons')
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('profile-comparisons')
export class ProfileComparisonsController {
  constructor(private readonly service: ProfileComparisonsService) {}

  @Get()
  @RequirePermission('view_profile_comparison')
  @ApiOperation({
    summary: 'Get profile comparisons with search & date filters',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 5 })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Text search (programme names)',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    description: 'Start date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    description: 'End date (YYYY-MM-DD)',
  })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.findAll(page, limit, search, dateFrom, dateTo);
  }

  @Post('compare')
  @RequirePermission('add_profile_comparison')
  @ApiOperation({ summary: 'Compare two profiles (via Python service)' })
  @ApiResponse({
    status: 200,
    description: 'Profiles compared successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiResponse({
    status: 500,
    description: 'Profile comparison failed',
  })
  compareProfiles(@Body() dto: CompareProfilesDto) {
    return this.service.compareProfiles(dto);
  }

  @Post('pre-comparaison')
  @RequirePermission('add_profile_comparison')
  @ApiOperation({
    summary: 'Pre-comparaison of profiles (via Python service)',
  })
  @ApiResponse({ status: 200, description: 'Pre-comparaison success' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 500, description: 'Pre-comparaison failed' })
  preComparaison(@Body() dto: PreComparaisonDto) {
    return this.service.preComparaison(dto);
  }

  @Get('export/csv')
  @RequirePermission('view_profile_comparison')
  @ApiOperation({ summary: 'Export profile comparisons as CSV file' })
  @ApiQuery({
    name: 'lang',
    required: false,
    description: 'fr | en',
  })
  async exportCsv(@Query('lang') lang = 'fr', @Res() res: Response) {
    const csvBuffer = await this.service.exportAllCsv(lang);

    const fileName = `profile_comparisons_${lang}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', csvBuffer.length);

    return res.send(csvBuffer);
  }
  @Get(':id')
  @ApiOperation({
    summary: 'Get a profile comparison by ID',
    description:
      'Returns a structured comparison between two programs, including task-to-module similarity details.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Profile comparison ID',
    example: 12,
  })
  @ApiResponse({
    status: 200,
    description: 'Profile comparison retrieved successfully',
    type: ProfileComparisonResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Profile comparison not found',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async getProfileComparisonById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ProfileComparisonResponseDto> {
    return this.service.getProfileComparisonById(id);
  }
  /**
   * DELETE
   */
  @Delete(':id')
  @RequirePermission('delete_profile_comparison')
  @ApiOperation({
    summary: 'Delete profile comparison and task similarities',
  })
  @ApiResponse({ status: 404, description: 'Not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
