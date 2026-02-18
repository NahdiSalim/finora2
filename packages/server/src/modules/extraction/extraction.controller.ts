import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { ExtractionService } from './extraction.service';
import { CreateExtractionDto } from './dto/create-extraction.dto'; // we’ll define this
import { JwtAuthGuard } from '../auth/guards';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('Extraction')
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('extraction')
export class ExtractionController {
  constructor(private readonly extractionService: ExtractionService) {}

  @Post()
  @RequirePermission('add_program')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Extract programme with type and file' })
  @ApiResponse({ status: 201, description: 'Extraction created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiBody({
    type: CreateExtractionDto,
  })
  async extract(
    @Body() body: CreateExtractionDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.extractionService.extract(body.type, file);
  }
}
