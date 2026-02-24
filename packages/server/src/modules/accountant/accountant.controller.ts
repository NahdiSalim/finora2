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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AccountantService } from './accountant.service';
import { CreateCollaboratorDto } from './dto/create-collaborator.dto';
import { CreateClientDto } from './dto/create-client.dto';
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
