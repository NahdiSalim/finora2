import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiProduces,
} from '@nestjs/swagger';
import { MultiComparaisonService } from './multicomparaison.service';
import { CreateMultiComparaisonDto } from './dto/create-multicomparaison.dto';
import { JwtAuthGuard } from '../auth/guards';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('multicomparaison')
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('multicomparaison')
export class MultiComparaisonController {
  constructor(
    private readonly multiComparaisonService: MultiComparaisonService,
  ) {}

  @Post()
  @RequirePermission('add_multi_comparison')
  @ApiOperation({
    summary: 'Create multiple comparisons',
    description:
      'Creates a multi-comparison by comparing one programme to multiple programmes. Creates individual comparisons for each programme pair and links them to the multi-comparison.',
  })
  @ApiBody({
    description: 'Programme IDs for multi-comparison',
    type: CreateMultiComparaisonDto,
    examples: {
      example1: {
        summary: 'Compare one programme to multiple programmes',
        value: {
          idProgrammeToCompare: 1,
          idProgrammeComparedTo: [2, 3, 4],
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Multi-comparison created successfully',
    schema: {
      type: 'object',
      example: {
        status: 'success',
        code: '200',
        data: {
          multiComparaisonId: 1,
          idProgrammeToCompare: 1,
          programmeToCompare: {
            id: 1,
            nomProgramme: 'Programme Name',
            nomProgrammeEn: 'Programme Name EN',
          },
          comparisons: [
            {
              idProgrammeComparedTo: 2,
              comparaisonId: 10,
              success: true,
            },
          ],
          totalRequested: 3,
          totalSuccessful: 3,
          totalFailed: 0,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid request or validation error',
  })
  createMultiComparaison(@Body() dto: CreateMultiComparaisonDto) {
    return this.multiComparaisonService.createMultiComparaison(dto);
  }

  @Get()
  @RequirePermission('view_multi_comparison')
  @ApiOperation({
    summary: 'Get all multi-comparisons',
    description:
      'Retrieves all multi-comparisons with pagination, including their associated comparisons.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Filter from date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Filter to date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'margeMin',
    required: false,
    type: Number,
    description: 'Min similarity rate 0-100',
  })
  @ApiQuery({
    name: 'margeMax',
    required: false,
    type: Number,
    description: 'Max similarity rate 0-100',
  })
  @ApiOkResponse({
    description: 'List of multi-comparisons retrieved successfully',
  })
  getAllMultiComparaisons(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('margeMin') margeMin?: string,
    @Query('margeMax') margeMax?: string,
  ) {
    return this.multiComparaisonService.getAllMultiComparaisons(
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
      search,
      startDate,
      endDate,
      margeMin != null ? Number(margeMin) : undefined,
      margeMax != null ? Number(margeMax) : undefined,
    );
  }

  @Get('export')
  @RequirePermission('view_multi_comparison')
  @ApiOperation({
    summary: 'Export multi-comparaisons to CSV file',
    description:
      'Exports multi-comparaisons data as a downloadable CSV file with localized field names based on language parameter. When lang=en, only English fields are used (no fallback).',
  })
  @ApiQuery({
    name: 'lang',
    required: false,
    enum: ['fr', 'en'],
    example: 'fr',
  })
  @ApiProduces('text/csv')
  @ApiOkResponse({
    description: 'CSV file downloaded successfully',
    content: {
      'text/csv': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async exportAllMultiComparaisonsCsv(
    @Res() res: Response,
    @Query('lang') lang: 'fr' | 'en' = 'fr',
  ) {
    const buffer =
      await this.multiComparaisonService.exportAllMultiComparaisonsCsv(lang);

    const filename = `multi_comparaisons_${lang}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);

    return res.send(buffer);
  }

  @Delete(':id')
  @RequirePermission('delete_multi_comparison')
  @ApiOperation({
    summary: 'Delete a multi-comparison',
    description:
      'Deletes a multi-comparison by its ID. Related comparisons will be unlinked (idMultiComparaison set to null).',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the multi-comparison to delete',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Multi-comparison deleted successfully',
    schema: {
      type: 'object',
      example: {
        status: 'success',
        code: '200',
        data: {
          id: 1,
          createdAt: '2026-01-08T12:00:00.000Z',
          createdById: 'system',
          totalGaps: 100,
          averageSimilarity: 0.75,
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Multi-comparison not found',
  })
  deleteMultiComparaison(@Param('id', ParseIntPipe) id: number) {
    return this.multiComparaisonService.deleteMultiComparaison(id);
  }

  @Get(':id/similar-objectives')
  @RequirePermission('view_multi_comparison')
  @ApiOperation({
    summary: 'Get similar objectives (modules) for a multi-comparison',
    description:
      'Aggregates similar objectives information (modulesTn/modulesAl) for all or selected comparisons within a multi-comparison.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the multi-comparison',
    example: 1,
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'programmeIds',
    required: false,
    type: String,
    description:
      'Comma-separated list (or repeated query params) of programme IDs to restrict the compared programmes included in the result',
  })
  @ApiOkResponse({
    description:
      'Similar objectives (modulesTn/modulesAl) for the multi-comparison retrieved successfully',
  })
  @ApiNotFoundResponse({
    description:
      'Multi-comparison not found or has no related comparisons matching the filters',
  })
  getSimilarObjectivesByMultiComparaisonId(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('programmeIds') programmeIds?: string | string[],
  ) {
    const programmeIdsArray = Array.isArray(programmeIds)
      ? programmeIds
      : programmeIds
        ? [programmeIds]
        : [];

    const parsedProgrammeIds = Array.from(
      new Set(
        programmeIdsArray
          .flatMap((value) => value.split(','))
          .map((value) => value.trim())
          .filter((value) => value.length > 0)
          .map((value) => Number(value))
          .filter((value) => !Number.isNaN(value)),
      ),
    );

    return this.multiComparaisonService.getSimilarObjectivesByMultiComparaisonId(
      id,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
      parsedProgrammeIds.length ? parsedProgrammeIds : undefined,
    );
  }

  @Get(':id/classification')
  @RequirePermission('view_detail_multi_comparison')
  @ApiOperation({
    summary: 'Get classifications for all comparaisons in a multi-comparison',
    description:
      'Retrieves classification data for each comparaison linked to the given multi-comparison ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the multi-comparison',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Classification data retrieved successfully',
  })
  @ApiNotFoundResponse({
    description: 'Multi-comparison not found',
  })
  getMultiComparaisonClassifications(@Param('id', ParseIntPipe) id: number) {
    return this.multiComparaisonService.getMultiComparaisonClassifications(id);
  }

  @Get(':id/gaps')
  @RequirePermission('view_detail_multi_comparison')
  @ApiOperation({
    summary: 'Get gaps (ecarts) for a multi-comparison',
    description:
      'Returns the list of ecarts for all simple comparisons inside the given multi-comparison, enriched with module/submodule info and programme existence flags.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the multi-comparison',
    example: 1,
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'programmeIds',
    required: false,
    type: String,
    description:
      'Comma-separated list (or repeated query params) of programme IDs to filter the compared programmes',
  })
  @ApiQuery({
    name: 'commun',
    required: false,
    type: Boolean,
    description:
      'When true, only ecarts that are common to all selected programmes are returned',
  })
  @ApiOkResponse({
    description: 'Gaps for the multi-comparison retrieved successfully',
  })
  @ApiNotFoundResponse({
    description: 'Multi-comparison not found or has no related comparisons',
  })
  getGapsByMultiComparaisonId(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('programmeIds') programmeIds?: string | string[],
    @Query('commun') commun?: string,
  ) {
    const programmeIdsArray = Array.isArray(programmeIds)
      ? programmeIds
      : programmeIds
        ? [programmeIds]
        : [];

    const parsedProgrammeIds = Array.from(
      new Set(
        programmeIdsArray
          .flatMap((value) => value.split(','))
          .map((value) => value.trim())
          .filter((value) => value.length > 0)
          .map((value) => Number(value))
          .filter((value) => !Number.isNaN(value)),
      ),
    );

    let communFlag: boolean | undefined;
    if (typeof commun === 'string') {
      const lower = commun.toLowerCase();
      if (['true', '1', 'yes'].includes(lower)) {
        communFlag = true;
      } else if (['false', '0', 'no'].includes(lower)) {
        communFlag = false;
      }
    }

    return this.multiComparaisonService.getGapsByMultiComparaisonId(
      id,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
      {
        programmeIds: parsedProgrammeIds.length
          ? parsedProgrammeIds
          : undefined,
        commun: communFlag,
      },
    );
  }

  @Get(':id')
  @RequirePermission('view_detail_multi_comparison')
  @ApiOperation({
    summary: 'Get multi-comparison by ID',
    description:
      'Retrieves a specific multi-comparison by its ID, including all associated comparisons with pagination.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the multi-comparison',
    example: 1,
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiOkResponse({
    description: 'Multi-comparison retrieved successfully',
  })
  @ApiNotFoundResponse({
    description: 'Multi-comparison not found',
  })
  getMultiComparaisonById(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.multiComparaisonService.getMultiComparaisonById(
      id,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @Post('classification/:id')
  @RequirePermission('view_detail_multi_comparison')
  @ApiOperation({
    summary: 'Run ecarts classification for a multi-comparaison',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 12,
    description: 'Multi-comparaison ID',
  })
  @ApiQuery({
    name: 'lang',
    required: false,
    enum: ['fr', 'en'],
    example: 'fr',
    description: 'Language used for the classification (defaults to fr)',
  })
  @ApiOkResponse({
    description: 'Classification triggered successfully',
    schema: {
      type: 'object',
      example: {
        status: 'success',
        code: '200',
        data: [
          {
            comparaisonId: 45,
            status: 'processed',
          },
          {
            comparaisonId: 46,
            status: 'skipped',
            message: 'No ecarts to classify',
          },
        ],
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid multi-comparaison ID',
  })
  multiComparaisonEcartsClassification(@Param('id') id: number) {
    return this.multiComparaisonService.triggerClassificationByMultiComparaison(
      Number(id),
    );
  }
}
