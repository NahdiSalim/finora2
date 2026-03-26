import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { User } from '@prisma/client';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserService } from './user.serivce';
import { UpdateUserDto } from './update-user.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { UpdateCompleteProfileDto } from './dto/update-complete-profile.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/types/user-type';
import type { Response } from 'express';
import type { AuthRequest } from '../auth/types/user-type';

export interface RequestWithUser extends Request {
  user: CurrentUser;
}

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: ['ADMINISTRATOR', 'ACCOUNTANT', 'COLLABORATOR', 'CLIENT'],
  })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'pending', 'suspended'] })
  @ApiOkResponse({ description: 'Liste des utilisateurs' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string
  ) {
    return await this.userService.getAll(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      search,
      role,
      status
    );
  }

  @Post()
  @RequirePermission('add_user')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Email already exists',
  })
  @ApiResponse({
    status: 500,
    description: 'User creation failed',
  })
  async createUser(@Body() createUserDto: CreateUserDto) {
    return await this.userService.create(createUserDto);
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMINISTRATOR')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Activer ou suspendre un utilisateur' })
  @ApiQuery({ name: 'action', required: true, enum: ['activate', 'suspend'] })
  @ApiOkResponse({ description: 'Statut mis à jour avec succès' })
  async updateUserStatus(
    @Param('id', ParseIntPipe) id: number,
    @Query('action') action: 'activate' | 'suspend',
    @Body() body?: { reason?: string }
  ) {
    return this.userService.updateUserStatus(id, action, body?.reason);
  }

  @Patch('profile/complete')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'photo', maxCount: 1 },
      { name: 'coverPhoto', maxCount: 1 },
      { name: 'cinFile', maxCount: 1 },
      { name: 'diplomaFile', maxCount: 1 },
      { name: 'companyLogo', maxCount: 1 },
      { name: 'companyPatentFile', maxCount: 1 },
      { name: 'companyRneFile', maxCount: 1 },
    ])
  )
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update complete profile (user + company + documents) - UNIFIED API' })
  @ApiOkResponse({ description: 'Profile updated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Email already exists or validation error',
  })
  async updateCompleteProfile(
    @Req() req: AuthRequest,
    @Body() dto: UpdateCompleteProfileDto,
    @UploadedFiles()
    files?: {
      photo?: Express.Multer.File[];
      coverPhoto?: Express.Multer.File[];
      cinFile?: Express.Multer.File[];
      diplomaFile?: Express.Multer.File[];
      companyLogo?: Express.Multer.File[];
      companyPatentFile?: Express.Multer.File[];
      companyRneFile?: Express.Multer.File[];
    }
  ) {
    const userId = req.user!.id;
    return await this.userService.updateCompleteProfile(userId, dto, files);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'photo', maxCount: 1 },
      { name: 'coverPhoto', maxCount: 1 },
    ])
  )
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update user profile with photo and cover photo' })
  @ApiOkResponse({ description: 'Profile updated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Email already exists or validation error',
  })
  async updateProfile(
    @Req() req: AuthRequest,
    @Body() dto: UpdateUserProfileDto,
    @UploadedFiles() files?: { photo?: Express.Multer.File[]; coverPhoto?: Express.Multer.File[] }
  ) {
    const userId = req.user!.id;
    const photo = files?.photo?.[0];
    const coverPhoto = files?.coverPhoto?.[0];
    return await this.userService.updateProfile(userId, dto, photo, coverPhoto);
  }

  @Patch('company')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('logo'))
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update company information with logo (accountant/client only)' })
  @ApiOkResponse({ description: 'Company updated successfully' })
  @ApiResponse({
    status: 400,
    description: 'User not associated with company',
  })
  @ApiResponse({
    status: 403,
    description: 'Only accountants and clients can update company',
  })
  async updateCompany(
    @Req() req: AuthRequest,
    @Body() dto: UpdateCompanyDto,
    @UploadedFile() logo?: Express.Multer.File
  ) {
    const userId = req.user!.id;
    return await this.userService.updateCompany(userId, dto, logo);
  }

  @Patch(':id')
  @RequirePermission('edit_user')
  @ApiOkResponse({ description: 'User updated successfully' })
  async updateUser(
    @Param('id') id: number,
    @Body() body: UpdateUserDto,
    @Req() req: RequestWithUser
  ) {
    const userId = req.user.id;
    // const userId = 3;
    return this.userService.update(id, body, userId);
  }

  @Get('export')
  @RequirePermission('view_user')
  @ApiOperation({ summary: 'Export all users to Excel/CSV format' })
  @ApiOkResponse({ description: 'Users exported successfully' })
  @ApiQuery({
    name: 'lang',
    required: false,
    enum: ['fr', 'en'],
    description: 'Export language (fr or en)',
  })
  async exportUsers(@Query('lang') lang: 'fr' | 'en' = 'fr', @Res() res: Response) {
    const csvBuffer = await this.userService.exportUsersCSV(lang);

    const fileName = `users_${lang}_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', csvBuffer.length);

    return res.send(csvBuffer);
  }

  @Get(':id')
  @RequirePermission('view_detail_user')
  @ApiOkResponse({ description: 'user' })
  async findOne(@Param('id') id: number): Promise<User | null> {
    return await this.userService.getById(id);
  }

  @Delete(':id')
  @RequirePermission('delete_user')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiOkResponse({ description: 'User deleted successfully' })
  @ApiBadRequestResponse({ description: 'Invalid user ID' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async deleteUser(@Param('id') id: number): Promise<User> {
    return await this.userService.deleteUser(id);
  }
}
