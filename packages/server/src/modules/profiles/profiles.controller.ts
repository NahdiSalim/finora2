import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProfilesService } from './profiles.service';
import { JwtAuthGuard } from '../auth/guards';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('Profiles')
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Delete(':id')
  @RequirePermission('delete_program')
  @ApiOperation({
    summary: 'Delete profile (blocked if profile has profile comparisons)',
  })
  @ApiResponse({
    status: 400,
    description: 'ERR_PROFILE_HAS_COMPARISON',
  })
  @ApiResponse({
    status: 404,
    description: 'Profile not found',
  })
  deleteProfileById(@Param('id', ParseIntPipe) id: number) {
    return this.profilesService.remove(id);
  }
  @Get(':id')
  @RequirePermission('view_detail_program')
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Get profile Europass data by id' })
  getProfileById(@Param('id', ParseIntPipe) id: number) {
    return this.profilesService.getProfileById(id);
  }
}
