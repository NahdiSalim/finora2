import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ProgrammeService } from './programme.service';
import { UpdateProgrammeDto } from './dto/update-programme.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { JwtAuthGuard } from '../auth/guards';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('programme')
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('programme')
export class ProgrammeController {
  constructor(private readonly programmeService: ProgrammeService) {}

  @Get()
  @RequirePermission('view_program')
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 5 })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'auteur', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, enum: ['Pr', 'eur'] })
  @ApiOkResponse({
    description: 'List programmes with pagination, search and filter',
  })
  getAllProgrammes(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('auteur') auteur?: string,
    @Query('type') type?: 'Pr' | 'eur',
  ) {
    return this.programmeService.getAllProgrammes(
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
      search,
      auteur,
      type,
    );
  }

  @Put(':id')
  @RequirePermission('edit_program')
  updateProgramme(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProgrammeDto,
  ) {
    return this.programmeService.updateProgramme(id, dto);
  }

  @Put('modules/:id')
  @RequirePermission('edit_program')
  updateModuleSousModule(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateModuleDto,
  ) {
    return this.programmeService.updateModuleSousModule(id, dto);
  }

  /* =========================
   * GET ALL PROGRAMME MODULES
   * ========================= */

  @Get(':id/modules')
  @RequirePermission('view_program')
  @ApiOperation({ summary: 'Get all programme sous-modules' })
  getAllProgrammeModules(@Param('id', ParseIntPipe) id: number) {
    return this.programmeService.getProgrammeWithModules(id);
  }

  @Delete(':id')
  @RequirePermission('delete_program')
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Programme deleted' })
  @ApiNotFoundResponse({ description: 'Programme not found' })
  deleteProgramme(@Param('id', ParseIntPipe) id: number) {
    return this.programmeService.deleteProgramme(id);
  }

  @Get('export')
  @RequirePermission('view_program')
  @ApiQuery({ name: 'type', required: true, enum: ['tn', 'de'] })
  @ApiQuery({
    name: 'lang',
    required: false,
    enum: ['fr', 'en'],
    example: 'fr',
  })
  @ApiOkResponse({
    description: 'Export programmes data as CSV file',
  })
  async exportProgrammes(
    @Res() res: Response,
    @Query('type') type: 'tn' | 'de',
    @Query('lang') lang: 'fr' | 'en' = 'fr',
  ) {
    const csvBuffer = await this.programmeService.exportProgrammes(type, lang);

    const fileName = `programmes_${type}_${lang}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', csvBuffer.length);

    return res.send(csvBuffer);
  }
}
