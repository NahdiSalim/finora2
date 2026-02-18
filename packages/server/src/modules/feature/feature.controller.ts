import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { FeatureService } from './feature.service';
import { JwtAuthGuard } from '../auth/guards';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('feature')
export class FeatureController {
  constructor(private readonly featureService: FeatureService) {}

  @Get()
  @RequirePermission('view_role')
  findAll(@Query('page') page = '1', @Query('limit') limit = '10') {
    return this.featureService.findAll(Number(page), Number(limit));
  }
}
