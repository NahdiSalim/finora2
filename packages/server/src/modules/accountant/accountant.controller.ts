import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Query,
  HttpCode,
  HttpStatus,
  Patch,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { AccountantService } from './accountant.service';
import { CreateCollaboratorDto } from './dto/create-collaborator.dto';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateAccountantProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleCode } from 'src/common/enums/role.enum';
import type { AuthRequest } from '../auth/types/user-type';

@ApiTags('Accountant')
@Controller('accountant')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AccountantController {
  constructor(private accountantService: AccountantService) {}

  @Post('collaborators')
  @Roles(RoleCode.ACCOUNTANT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a collaborator (accountant only)' })
  @ApiResponse({
    status: 201,
    description: 'Collaborator created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Email already exists or validation error',
  })
  @ApiResponse({
    status: 403,
    description: 'Only accountants can create collaborators',
  })
  async createCollaborator(@Req() req: AuthRequest, @Body() dto: CreateCollaboratorDto) {
    const accountantId = req.user!.id;
    return await this.accountantService.createCollaborator(accountantId, dto);
  }

  @Post('clients')
  @Roles(RoleCode.ACCOUNTANT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a client with automatic relationship (accountant only)' })
  @ApiResponse({
    status: 201,
    description: 'Client created successfully and relationship established',
  })
  @ApiResponse({
    status: 400,
    description: 'Email already exists or validation error',
  })
  @ApiResponse({
    status: 403,
    description: 'Only accountants can create clients',
  })
  async createClient(@Req() req: AuthRequest, @Body() dto: CreateClientDto) {
    const accountantId = req.user!.id;
    return await this.accountantService.createClient(accountantId, dto);
  }

  @Get('collaborators')
  @Roles(RoleCode.ACCOUNTANT)
  @ApiOperation({ summary: 'Get all collaborators of accountant firm' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'List of collaborators retrieved successfully',
  })
  async getCollaborators(
    @Req() req: AuthRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const accountantId = req.user!.id;
    return await this.accountantService.getCollaborators(
      accountantId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10
    );
  }

  @Get('clients')
  @Roles(RoleCode.ACCOUNTANT)
  @ApiOperation({ summary: 'Get all clients of accountant firm' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'List of clients retrieved successfully',
  })
  async getClients(
    @Req() req: AuthRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    console.log(req, 'req');
    const accountantId = req.user!.id;
    return await this.accountantService.getClients(
      accountantId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10
    );
  }
}

// Public Controller for browsing accountant profiles
@ApiTags('Public - Accountants')
@Controller('public/accountants')
export class PublicAccountantsController {
  constructor(private accountantService: AccountantService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Browse accountant profiles (public, no auth required)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'location', required: false, type: String, description: 'Filter by city' })
  @ApiQuery({
    name: 'specialty',
    required: false,
    type: String,
    description: 'Filter by specialty/position',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by name or company',
  })
  @ApiResponse({
    status: 200,
    description: 'List of accountant profiles retrieved successfully',
  })
  async browseAccountants(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('location') location?: string,
    @Query('specialty') specialty?: string,
    @Query('search') search?: string
  ) {
    return await this.accountantService.browseAccountants({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      location,
      specialty,
      search,
    });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get accountant profile details (public, no auth required)' })
  @ApiResponse({
    status: 200,
    description: 'Accountant profile retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Accountant profile not found',
  })
  async getAccountantProfile(@Query('id') id: string) {
    return await this.accountantService.getAccountantProfile(parseInt(id));
  }
}

// Accountant Profile Management Controller
@ApiTags('Accountant - Profile')
@Controller('accountant/profile')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AccountantProfileController {
  constructor(private accountantService: AccountantService) {}

  @Get('me')
  @Roles(RoleCode.ACCOUNTANT)
  @ApiOperation({ summary: 'Get my public profile (accountant only)' })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
  })
  async getMyProfile(@Req() req: AuthRequest) {
    const accountantId = req.user!.id;
    return await this.accountantService.getAccountantProfile(accountantId);
  }

  @Patch('update')
  @Roles(RoleCode.ACCOUNTANT)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'photo', maxCount: 1 },
      { name: 'coverPhoto', maxCount: 1 },
    ])
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update my public profile with photo and cover photo (accountant only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
  })
  async updateMyProfile(
    @Req() req: AuthRequest,
    @Body() data: UpdateAccountantProfileDto,
    @UploadedFiles() files?: { photo?: Express.Multer.File[]; coverPhoto?: Express.Multer.File[] }
  ) {
    const accountantId = req.user!.id;
    const photo = files?.photo?.[0];
    const coverPhoto = files?.coverPhoto?.[0];
    return await this.accountantService.updateMyProfile(accountantId, data, photo, coverPhoto);
  }
}
