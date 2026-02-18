import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
  ApiOperation,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { ModuleService } from './module.service';
import { JwtAuthGuard } from '../auth/guards';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('module')
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('module')
export class ModuleController {
  constructor(private readonly moduleService: ModuleService) {}

  @Get('comparaison/:id')
  @RequirePermission('view_comparison')
  @ApiOperation({
    summary: 'Get modules by comparaison ID',
    description:
      'Retrieves modules and sous-modules for a given comparaison, including similarity mappings and gaps (ecarts)',
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
        id_Programme_Compare: 1350,
        Nom_Programme_Comapare: 'Programme Name',
        id_Programme_Comparable: 1362,
        Nom_Programme_Comparable: 'Programme Name 2',
        TauxSimilarité: '0.85',
        modulesTn: ['Module 1,30 heures', 'Module 2,45 heures'],
        modulesTn_en: ['Module 1,30 hours', 'Module 2,45 hours'],
        modulesAl: [['Module Name,1,80', [], []]],
        modulesAl_en: [['Module Name,1,80', [], []]],
        ecart: [
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
    description: 'Invalid request',
    schema: {
      type: 'object',
      properties: {
        errorCode: { type: 'string', example: 'HTTP_ERROR' },
        message: { type: 'string', example: 'comparaison_id is required' },
      },
    },
  })
  getModuleById(@Param('id', ParseIntPipe) id: number) {
    return this.moduleService.getModuleById(id);
  }
}
