import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Body,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiBody,
  ApiBadRequestResponse,
  ApiOperation,
  ApiProduces,
} from '@nestjs/swagger';
import { ComparaisonService } from './comparaison.service';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('comparaison')
@Controller('comparaison')
export class ComparaisonController {
  constructor(private readonly comparaisonService: ComparaisonService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 5 })
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
  // @ApiOkResponse({ description: 'List comparaisons with pagination and search' })
  @ApiOperation({
    summary: 'Get all comparaisons',
    description: 'Get all comparaisons with its pagination, filter and search.',
  })
  getAllComparaisons(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('margeMin') margeMin?: string,
    @Query('margeMax') margeMax?: string,
  ) {
    return this.comparaisonService.getAllComparaisons(
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
      search,
      startDate,
      endDate,
      margeMin != null ? Number(margeMin) : undefined,
      margeMax != null ? Number(margeMax) : undefined,
    );
  }

  @Get(':id/ecarts')
  @ApiOperation({
    summary: 'Get ecarts by comparaison ID',
    description:
      'Retrieves paginated list of ecarts (gaps) for a given comparaison - sous-modules without similar objectives',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the comparaison to retrieve ecarts for',
    example: 55,
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiOkResponse({
    description: 'Ecarts retrieved successfully',
    schema: {
      type: 'object',
      example: {
        data: [
          {
            module_id: 1,
            nom_module: 'Module Name',
            submodule_id: 1,
            nom_sousmodule: 'Sous Module Name',
            description_sousmodule: null,
            Code_Objectif: 'A',
            Code_Module: '1',
          },
        ],
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Comparaison not found',
    schema: {
      type: 'object',
      properties: {
        errorCode: { type: 'string', example: 'HTTP_ERROR' },
        message: { type: 'string', example: 'Comparaison not found' },
      },
    },
  })
  getEcartByComparaisonId(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.comparaisonService.getEcartByComparaisonId(
      id,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new comparaison',
    description:
      'Creates a new comparaison by calling the Python API with the provided programme IDs. The API will compare the two programmes and return the comparison results.',
  })
  @ApiBody({
    description: 'Programme IDs to compare',
    schema: {
      type: 'object',
      properties: {
        idProgrammeToCompare: {
          type: 'number',
          example: 1,
          description: 'ID of the first programme to compare',
        },
        idProgrammeComparedTo: {
          type: 'number',
          example: 2,
          description: 'ID of the second programme to compare',
        },
      },
      required: ['idProgrammeToCompare', 'idProgrammeComparedTo'],
    },
    examples: {
      example1: {
        summary: 'Compare two programmes',
        value: {
          idProgrammeToCompare: 1,
          idProgrammeComparedTo: 2,
        },
      },
    },
  })
  @ApiOkResponse({
    description:
      'Comparaison created successfully. Returns the response from the Python API.',
    schema: {
      type: 'object',
      example: {
        success: true,
        data: {
          tauxDeSimilarite: 0.85,
          nombreEcart: 5,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid request or Python API error',
    schema: {
      type: 'object',
      properties: {
        errorCode: { type: 'string', example: 'HTTP_ERROR' },
        message: {
          type: 'string',
          example: 'Python API error: 400 - Invalid programme IDs',
        },
      },
    },
  })
  createComparaison(
    @Body()
    body: {
      idProgrammeToCompare: number;
      idProgrammeComparedTo: number;
    },
  ) {
    return this.comparaisonService.createComparaison(
      body.idProgrammeToCompare,
      body.idProgrammeComparedTo,
    );
  }

  @Post(':id/trigger-classification')
  @ApiOperation({
    summary: 'Trigger classification for a comparaison',
    description:
      'Fetches ecarts for the comparaison, builds tasks, and calls the Python classification API. Used when landing on the detail page so classification runs in the background.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Comparaison ID' })
  @ApiQuery({ name: 'lang', required: false, type: String, enum: ['fr', 'en'] })
  triggerClassification(
    @Param('id', ParseIntPipe) id: number,
    @Query('lang') lang?: string,
  ) {
    return this.comparaisonService.triggerClassification(id);
  }

  @Get(':id/modules/all')
  @ApiOperation({
    summary: 'Get all modules by comparaison ID (simplified)',
    description:
      'Retrieves all modules for a comparaison with simplified structure including module IDs and objective counts grouped by Code_Objectif',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the comparaison to retrieve modules for',
    example: 55,
  })
  @ApiOkResponse({
    description: 'Modules retrieved successfully',
    schema: {
      type: 'object',
      example: {
        comparaisonID: 55,
        modulesTn: ['Module Name,80'],
        modulesTn_en: ['Module Name EN,80'],
        modulesAl: [
          [
            1,
            'Module Name,Code,80',
            'Module Name EN,Code,80',
            [],
            [],
            [],
            ['1', '2', '3'],
          ],
        ],
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Comparaison not found',
    schema: {
      type: 'object',
      properties: {
        errorCode: { type: 'string', example: 'HTTP_ERROR' },
        message: { type: 'string', example: 'Comparaison not found' },
      },
    },
  })
  getAllModulesByComparaisonId(@Param('id', ParseIntPipe) id: number) {
    return this.comparaisonService.getAllModulesByComparaisonId(id);
  }

  @Get(':id/modules/all/flattened')
  @ApiOperation({
    summary:
      'Get flattened modulesAl by comparaison ID grouped by Nom_Sous_Module_Referent',
    description:
      'Retrieves flattened modulesAl data for a comparaison, grouped by Nom_Sous_Module_Referent with pagination',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the comparaison to retrieve modules for',
    example: 472,
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiOkResponse({
    description: 'Flattened modules retrieved successfully',
    schema: {
      type: 'object',
      example: {
        status: 'success',
        code: '200',
        data: [
          {
            Nom_Sous_Module_Referent: 'Referent Name',
            items: [
              {
                Code_Objectif: '4',
                Code_Competence: '2',
                id: 509421,
                Nom_Sous_Module_Similaire: 'Similar Name',
                id_Similaire: 169866,
                ModuleTn: 'Module Tn Name',
                CodeModuleTn: '1',
                Code_Module: '4',
              },
            ],
          },
        ],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          limitPerPage: 10,
          totalCount: 1,
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Comparaison not found',
    schema: {
      type: 'object',
      properties: {
        errorCode: { type: 'string', example: 'HTTP_ERROR' },
        message: { type: 'string', example: 'Comparaison not found' },
      },
    },
  })
  getFlattenedModulesAlByComparaisonId(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.comparaisonService.getFlattenedModulesAlByComparaisonId(
      id,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @Get(':comparaisonId/modules/:moduleId')
  @ApiOperation({
    summary: 'Get module details by ID with pagination',
    description:
      'Retrieves detailed information for a specific module including all similar objectives with pagination',
  })
  @ApiParam({
    name: 'comparaisonId',
    type: Number,
    description: 'ID of the comparaison',
    example: 55,
  })
  @ApiParam({
    name: 'moduleId',
    type: Number,
    description: 'ID of the module to retrieve',
    example: 1,
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 5 })
  @ApiOkResponse({
    description: 'Module details retrieved successfully',
    schema: {
      type: 'object',
      example: {
        moduleId: 1,
        comparaisonID: 55,
        data: [
          'Module Name,Code,80',
          [],
          [],
          [],
          [
            {
              id: 503222,
              Code_Objectif: '11',
              Nom_Sous_Module_Referent: 'Referent Name',
              Nom_Sous_Module_Similaire: 'Similar Name',
              id_Similaire: 169236,
            },
          ],
        ],
        meta: {
          page: 1,
          limit: 5,
          total: 10,
          totalPages: 2,
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Comparaison or Module not found',
    schema: {
      type: 'object',
      properties: {
        errorCode: { type: 'string', example: 'HTTP_ERROR' },
        message: { type: 'string', example: 'Comparaison not found' },
      },
    },
  })
  getModuleByIdWithDetails(
    @Param('comparaisonId', ParseIntPipe) comparaisonId: number,
    @Param('moduleId', ParseIntPipe) moduleId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.comparaisonService.getModuleByIdWithDetails(
      moduleId,
      comparaisonId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @Delete(':id')
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Comparaison deleted' })
  @ApiNotFoundResponse({ description: 'Comparaison not found' })
  deleteComparaison(@Param('id', ParseIntPipe) id: number) {
    return this.comparaisonService.deleteComparaison(id);
  }

  @Get('export')
  @ApiOperation({
    summary: 'Export comparisons to CSV file',
    description:
      'Exports comparisons data as a downloadable CSV file with localized headers based on language parameter. ' +
      'Filters results by similarity rate range (0–100). ' +
      'When lang=en, only English fields are used (no fallback to French).',
  })
  @ApiQuery({
    name: 'lang',
    required: false,
    enum: ['fr', 'en'],
    example: 'fr',
    description: 'Language for headers and data (fr | en)',
  })
  @ApiQuery({
    name: 'minSimilarity',
    required: false,
    example: 0,
    description: 'Minimum similarity rate (0–100)',
  })
  @ApiQuery({
    name: 'maxSimilarity',
    required: false,
    example: 100,
    description: 'Maximum similarity rate (0–100)',
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
  @Get('export')
  @RequirePermission('view_comparison')
  @ApiOperation({
    summary: 'Export comparaisons to CSV file',
    description:
      'Exports profile comparisons as a CSV file. Supports language (fr/en) and similarity rate filtering (0–100).',
  })
  @ApiQuery({
    name: 'lang',
    required: false,
    enum: ['fr', 'en'],
    example: 'fr',
  })
  @ApiQuery({
    name: 'minSimilarity',
    required: false,
    type: Number,
    example: 0,
  })
  @ApiQuery({
    name: 'maxSimilarity',
    required: false,
    type: Number,
    example: 100,
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
  async exportComparaisonsToCSV(
    @Res() res: Response,
    @Query('lang') lang?: 'fr' | 'en',
    @Query('minSimilarity') minSimilarity?: string,
    @Query('maxSimilarity') maxSimilarity?: string,
  ) {
    /* 🔒 SAFE PARAMS */
    const safeLang: 'fr' | 'en' = lang === 'en' ? 'en' : 'fr';

    const min = Number.isFinite(Number(minSimilarity))
      ? Math.max(0, Math.min(100, Number(minSimilarity)))
      : 0;

    const max = Number.isFinite(Number(maxSimilarity))
      ? Math.max(0, Math.min(100, Number(maxSimilarity)))
      : 100;

    /* 📦 SERVICE CALL (RETURNS BUFFER) */
    const csvBuffer = await this.comparaisonService.exportComparaisonsToCSV(
      safeLang,
      min,
      max,
    );

    /* 🏷️ FILENAME */
    const fileName = `comparaisons_${safeLang}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    /* 📤 RESPONSE HEADERS */
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    );
    res.setHeader('Content-Length', csvBuffer.length);

    return res.send(csvBuffer);
  }

  @Get(':id/classifications')
  @ApiOperation({
    summary: 'Get all classifications by comparaison ID',
    description:
      'Retrieves all task classifications for a given comparaison, grouped by skill type (soft skills, technical skills, green skills, language skills, unrecognized).',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the comparaison to retrieve classifications for',
    example: 55,
  })
  @ApiOkResponse({
    description: 'Classifications retrieved successfully',
    schema: {
      type: 'object',
      example: {
        status: 'success',
        code: '200',
        data: {
          'soft skills': [
            {
              module: 'Module Name',
              module_en: 'Module Name EN',
              task_id: 1,
              ecart: 'Task Description',
              ecart_en: 'Task Description EN',
            },
          ],
          'technical skills': [],
          'green skills': [],
          'language skills': [],
          unrecognized: [],
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Comparaison not found',
    schema: {
      type: 'object',
      properties: {
        errorCode: { type: 'string', example: 'HTTP_ERROR' },
        message: { type: 'string', example: 'Comparaison not found' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Bad request - comparaison_id is required',
    schema: {
      type: 'object',
      properties: {
        errorCode: { type: 'string', example: 'HTTP_ERROR' },
        message: { type: 'string', example: 'comparaison_id is required' },
      },
    },
  })
  getAllClassificationList(@Param('id', ParseIntPipe) id: number) {
    return this.comparaisonService.getAllClassificationList(id);
  }

  @Get(':id/export-matrices')
  @ApiOperation({
    summary: 'Export comparaison module matrices to CSV file',
    description:
      'Exports the module matrix data for a comparaison as a downloadable CSV file. The matrix shows modules, objectives, and similarity rates. Supports language selection (fr/en).',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the comparaison to export matrices for',
    example: 55,
  })
  @ApiQuery({
    name: 'lang',
    required: false,
    type: String,
    enum: ['fr', 'en'],
    example: 'fr',
    description:
      'Language for field names and data (fr or en). When en is selected, only English fields are used without fallback.',
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
  @ApiBadRequestResponse({
    description: 'Bad request - comparaison_id is required',
    schema: {
      type: 'object',
      properties: {
        errorCode: { type: 'string', example: 'HTTP_ERROR' },
        message: { type: 'string', example: 'comparaison_id is required' },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Comparaison not found',
    schema: {
      type: 'object',
      properties: {
        errorCode: { type: 'string', example: 'HTTP_ERROR' },
        message: { type: 'string', example: 'Comparaison not found' },
      },
    },
  })
  async exportComparaisonCsvById(
    @Res() res: Response,
    @Param('id', ParseIntPipe) id: number,
    @Query('lang') lang?: 'fr' | 'en',
  ) {
    const csvBuffer = await this.comparaisonService.exportComparaisonCsvById(
      id,
      lang || 'fr',
    );

    const fileName = `comparaison_${id}_${lang || 'fr'}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    // Headers (IDENTIQUES aux autres exports)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', csvBuffer.length);

    return res.send(csvBuffer);
  }

  @Post('pre-comparaison/:id')
  @ApiOperation({
    summary: 'Get pre-comparaison similar programmes',
    description:
      'Retrieves a list of similar programmes by calling the Python API pre-comparaison endpoint. Uses the programme name from the given programme ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the programme to find similar programmes for',
    example: 1294,
  })
  @ApiOkResponse({
    description: 'Similar programmes retrieved successfully',
    schema: {
      type: 'object',
      example: {
        status: 'success',
        code: '200',
        data: {
          similarProgrammes: [],
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid request or Python API error',
    schema: {
      type: 'object',
      properties: {
        errorCode: { type: 'string', example: 'HTTP_ERROR' },
        message: {
          type: 'string',
          example: 'Python API error: 400 - Invalid programme ID',
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Programme not found',
    schema: {
      type: 'object',
      properties: {
        errorCode: { type: 'string', example: 'HTTP_ERROR' },
        message: { type: 'string', example: 'Programme with ID 999 not found' },
      },
    },
  })
  getPreComparaison(@Param('id', ParseIntPipe) id: number) {
    return this.comparaisonService.getPreComparaison(id);
  }

  @Post('classification')
  @ApiOperation({
    summary: 'Get ecarts classification',
    description:
      'Calls the Python API classification endpoint with the provided body to classify ecarts. Supports language parameter (fr/en).',
  })
  @ApiQuery({
    name: 'lang',
    required: false,
    type: String,
    enum: ['fr', 'en'],
    example: 'fr',
    description: 'Language for the classification (fr or en). Defaults to fr.',
  })
  @ApiBody({
    description: 'Body to send to the Python API classification endpoint',
    schema: {
      type: 'object',
      example: {
        comparaison_id: 55,
        tasks: [
          {
            module: 'Module Name',
            ecart: 'Sous Module Name',
          },
        ],
      },
    },
  })
  @ApiOkResponse({
    description: 'Classification retrieved successfully',
    schema: {
      type: 'object',
      example: {
        status: 'success',
        code: '200',
        data: {
          // Response from Python API
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid request or Python API error',
    schema: {
      type: 'object',
      properties: {
        errorCode: { type: 'string', example: 'HTTP_ERROR' },
        message: {
          type: 'string',
          example: 'Python API error: 400 - Invalid request body',
        },
      },
    },
  })
  ecartsClassification(
    @Body() body: Record<string, unknown>,
    @Query('lang') lang?: string,
  ) {
    return this.comparaisonService.ecartsClassification(body);
  }

  @Post('update-classification')
  @ApiOperation({
    summary: 'Update ecarts classification',
    description:
      'Calls the Python API update-classification endpoint with the provided body to update classification data.',
  })
  @ApiBody({
    description:
      'Body to send to the Python API update-classification endpoint',
    schema: {
      type: 'object',
      example: {
        // Example body structure from Python API
        task_id: 1,
        task_class: 'soft skills',
      },
    },
  })
  @ApiOkResponse({
    description: 'Classification updated successfully',
    schema: {
      type: 'object',
      example: {
        status: 'success',
        code: '200',
        data: {
          // Response from Python API
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid request or Python API error',
    schema: {
      type: 'object',
      properties: {
        errorCode: { type: 'string', example: 'HTTP_ERROR' },
        message: {
          type: 'string',
          example: 'Python API error: 400 - Invalid request body',
        },
      },
    },
  })
  ecartsClassificationUpdate(@Body() body: Record<string, unknown>) {
    return this.comparaisonService.ecartsClassificationUpdate(body);
  }

  @Post('remove-similarity')
  @ApiOperation({
    summary: 'Remove similarity',
    description:
      'Calls the Python API remove-similarity endpoint with the provided body to remove a similarity relationship.',
  })
  @ApiBody({
    description: 'Body to send to the Python API remove-similarity endpoint',
    schema: {
      type: 'object',
      example: {
        // Example body structure from Python API
        similarity_id: 1,
        comparaison_id: 55,
      },
    },
  })
  @ApiOkResponse({
    description: 'Similarity removed successfully',
    schema: {
      type: 'object',
      example: {
        status: 'success',
        code: '200',
        data: {
          msg: 'Similarity removed successfully',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid request or Python API error',
    schema: {
      type: 'object',
      properties: {
        errorCode: { type: 'string', example: 'HTTP_ERROR' },
        message: {
          type: 'string',
          example: 'Python API error: 400 - Invalid request body',
        },
      },
    },
  })
  removeSimilarity(@Body() body: Record<string, unknown>) {
    return this.comparaisonService.removeSimilarity(body);
  }
  @Post('add-similarity')
  @ApiOperation({
    summary: 'Add similarity (assign a gap)',
    description:
      'Creates a SousModuleSimilarite entry to assign a gap objective to a selected TN objective for a given comparaison.',
  })
  @ApiBody({
    description: 'Similarity data',
    schema: {
      type: 'object',
      required: [
        'comparaison_id',
        'id_SousModule_ComparedTo',
        'id_SousModule_Comparable',
      ],
      properties: {
        comparaison_id: { type: 'number', example: 55 },
        id_SousModule_ComparedTo: { type: 'number', example: 123 },
        id_SousModule_Comparable: { type: 'number', example: 456 },
        tauxDeSimilarite: { type: 'number', example: 1 },
      },
    },
  })
  @ApiOkResponse({
    description: 'Similarity created successfully',
    schema: {
      type: 'object',
      example: {
        status: 'success',
        code: '200',
        data: { id: 1 },
      },
    },
  })
  addSimilarity(@Body() body: Record<string, unknown>) {
    return this.comparaisonService.addSimilarity(body);
  }
  @Get('programme/:id/modules')
  @ApiOperation({
    summary: 'Get all sous-modules for a programme',
    description:
      'Retrieves all sous-modules from all modules of a programme with pagination. Returns simplified format with id, name, and nameEn.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the programme to retrieve sous-modules for',
    example: 1,
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiOkResponse({
    description: 'Sous-modules retrieved successfully',
    schema: {
      type: 'object',
      example: {
        status: 'success',
        code: '200',
        data: [
          {
            id: 1,
            name: 'Sous Module Name',
            nameEn: 'Sous Module Name EN',
            codeModule: 'M1',
            codeObjectif: '1.1',
          },
        ],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          limitPerPage: 10,
          totalCount: 1,
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Programme not found',
    schema: {
      type: 'object',
      properties: {
        errorCode: { type: 'string', example: 'HTTP_ERROR' },
        message: { type: 'string', example: 'Programme not found' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Bad request - programme_id is required',
    schema: {
      type: 'object',
      properties: {
        errorCode: { type: 'string', example: 'HTTP_ERROR' },
        message: { type: 'string', example: 'programme_id is required' },
      },
    },
  })
  getAllProgrammeModules(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.comparaisonService.getAllProgrammeModules(
      id,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }
}
