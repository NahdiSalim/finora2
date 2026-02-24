import { Controller, Get, Post, Param, Query, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthRequest } from '../auth/types/user-type';

@ApiTags('storage')
@UseGuards(JwtAuthGuard)
@Controller('storage')
@ApiBearerAuth('JWT-auth')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  /**
   * Get storage usage for current user's company
   */
  @Get('usage')
  @ApiOperation({ summary: 'Get storage usage for my company' })
  async getMyStorageUsage(@Req() req: AuthRequest) {
    const companyId = req.user!.companyId;

    if (!companyId) {
      return {
        status: 'error',
        code: '400',
        message: 'User must belong to a company',
      };
    }

    return this.storageService.getStorageUsage(companyId);
  }

  /**
   * Admin: Get storage usage for any company
   */
  @Get('quota/:companyId')
  @UseGuards(RolesGuard)
  @Roles('ADMINISTRATOR')
  @ApiOperation({ summary: '[Admin] Get storage usage for a company' })
  async getStorageUsage(@Param('companyId', ParseIntPipe) companyId: number) {
    return this.storageService.getStorageUsage(companyId);
  }

  /**
   * Admin: Get all companies with storage usage
   */
  @Get('companies')
  @UseGuards(RolesGuard)
  @Roles('ADMINISTRATOR')
  @ApiOperation({ summary: '[Admin] Get all companies storage usage' })
  async getAllCompaniesUsage() {
    return this.storageService.getAllCompaniesUsage();
  }

  /**
   * Admin: Get all companies near their storage limit
   */
  @Get('alerts')
  @UseGuards(RolesGuard)
  @Roles('ADMINISTRATOR')
  @ApiOperation({ summary: '[Admin] Get companies near storage limit' })
  async getCompaniesNearLimit() {
    return this.storageService.getCompaniesNearLimit();
  }

  /**
   * Admin: Purge old archived documents for a company
   */
  @Post('purge/:companyId')
  @UseGuards(RolesGuard)
  @Roles('ADMINISTRATOR')
  @ApiOperation({ summary: '[Admin] Purge old archived documents' })
  @ApiQuery({
    name: 'olderThanDays',
    required: false,
    type: Number,
    description: 'Delete archived documents older than X days (default: 90)',
  })
  async purgeOldDocuments(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Query('olderThanDays', new ParseIntPipe({ optional: true }))
    olderThanDays?: number
  ) {
    return this.storageService.purgeOldDocuments(companyId, olderThanDays || 90);
  }
}
