import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ApiError } from 'src/common/errors/api-error';
import { errors } from 'src/common/errors/errors';
import { UpdateUserDto } from './update-user.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Prisma } from '@prisma/client';
import { HashService } from 'src/common/crypto/hash.service';
import { JwtTokenService } from 'src/common/jwt/jwt-token.service';
import { FileUploadService, FileCategory } from 'src/common/services/file-upload.service';
import { UserStatus } from 'src/common/enums/user-status.enum';
import * as bcrypt from 'bcrypt';
import { stringify } from 'csv-stringify/sync';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private hashService: HashService,
    private jwtTokenService: JwtTokenService,
    private fileUploadService: FileUploadService
  ) {}

  async getAll(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;
    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        {
          role: {
            OR: [
              { nameFr: { contains: search, mode: 'insensitive' } },
              { nameEn: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          role: {
            select: {
              nameFr: true,
              nameEn: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Register new user
  public async create(createUserDto: CreateUserDto) {
    const { username, email, password, phone, id_role } = createUserDto;

    const existingUser = await this.prisma.user.findFirst({ where: { email } });
    if (existingUser) {
      throw new ApiError(
        errors.ERR_USER_EXISTS.message,
        errors.ERR_USER_EXISTS.code,
        errors.ERR_USER_EXISTS.errorCode
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const user = await this.prisma.user.create({
        data: {
          username,
          email,
          password: hashedPassword,
          phone,
          id_role,
        },
      });

      const payload = { sub: user.id, email: user.email };
      const { accessToken, refreshToken } = this.jwtTokenService.generateTokens(payload);

      await this.jwtTokenService.storeRefreshToken(user.id, refreshToken);

      return {
        success: true,
        message: 'User created successfully',
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          roleId: user.id_role,
          phone: user.phone,
          accessToken,
          refreshToken,
        },
      };
    } catch (error) {
      console.error('User creation error:', error);
      throw error;
    }
  }

  async getById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: {
          select: {
            nameFr: true,
            nameEn: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

  async update(
    targetUserId: number,
    body: UpdateUserDto,
    currentUserId: number
  ): Promise<{
    status: string;
    code: string;
    message: string;
  }> {
    const { ...data } = body;

    // Validate role if provided
    if (data.id_role) {
      const role = await this.prisma.role.findUnique({
        where: { id: data.id_role },
      });

      if (!role) {
        throw new ApiError(
          errors.NOT_FOUND.message,
          errors.NOT_FOUND.code,
          errors.NOT_FOUND.errorCode
        );
      }
    }

    // Verify current user is active
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!currentUser || currentUser.status !== UserStatus.ACTIVE) {
      throw new ApiError(
        errors.ERR_ANOTHORIZED.message,
        errors.ERR_ANOTHORIZED.code,
        errors.ERR_ANOTHORIZED.errorCode
      );
    }

    // Find user to update
    const userToUpdate = await this.prisma.user.findUnique({
      where: { id: targetUserId, status: UserStatus.ACTIVE },
      include: { role: true },
    });

    if (!userToUpdate) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode
      );
    }

    // Prevent updating admin user
    if (userToUpdate.role?.id === 1) {
      throw new ApiError(
        errors.ADMIN_UPDATE_FORBIDDEN.message,
        errors.ADMIN_UPDATE_FORBIDDEN.code,
        errors.ADMIN_UPDATE_FORBIDDEN.errorCode
      );
    }

    // Check email uniqueness if email is being updated
    if (data.email) {
      const emailExists = await this.prisma.user.findFirst({
        where: {
          email: data.email,
          id: { not: targetUserId },
        },
      });

      if (emailExists) {
        throw new ApiError(
          'ERR_EMAIL_EXISTS',
          errors.BAD_REQUEST.code,
          errors.ERR_EMAIL_EXISTS.errorCode
        );
      }
    }

    // Update user
    await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        ...data,
        updatedById: currentUserId,
      },
    });

    return {
      status: 'success',
      code: '200',
      message: 'updateUserSuccess',
    };
  }

  async deleteUser(id: number) {
    const userToDelete = await this.prisma.user.findUnique({ where: { id } });

    if (!userToDelete) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode
      );
    }

    if (userToDelete.id_role === 1) {
      throw new ApiError(
        errors.FORBIDDEN_DELETE_ADMIN_USER.message,
        errors.FORBIDDEN_DELETE_ADMIN_USER.code,
        errors.FORBIDDEN_DELETE_ADMIN_USER.errorCode
      );
    }

    const user = await this.prisma.user.delete({
      where: { id },
    });

    return user;
  }

  async toggleActive(targetUserId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { role: true },
    });

    if (!user) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode
      );
    }

    if (user.role?.id === 1) {
      throw new ApiError(
        errors.ADMIN_ROLE_UPDATE_FORBIDDEN.message,
        errors.ADMIN_ROLE_UPDATE_FORBIDDEN.code,
        errors.ADMIN_ROLE_UPDATE_FORBIDDEN.errorCode
      );
    }

    const newStatus = user.status === UserStatus.ACTIVE ? UserStatus.SUSPENDED : UserStatus.ACTIVE;

    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { status: newStatus },
    });

    return {
      message:
        updatedUser.status === UserStatus.ACTIVE
          ? 'User has been activated!'
          : 'User has been deactivated!',
      user: updatedUser,
    };
  }

  async suspendUser(targetUserId: number, reason?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { role: true },
    });

    if (!user) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode
      );
    }

    // Prevent suspending admin accounts
    if (user.role?.id === 1) {
      throw new ApiError('Cannot suspend administrator accounts', 403, 'FORBIDDEN_SUSPEND_ADMIN');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { status: UserStatus.SUSPENDED },
    });

    return {
      success: true,
      message: 'User account suspended successfully',
      user: updatedUser,
    };
  }

  async exportUsersCSV(lang: 'fr' | 'en' = 'fr'): Promise<Buffer> {
    const useEnglish = lang === 'en';

    const LABELS = {
      fr: {
        REFERENCE: 'Référence',
        USERNAME: 'Identifiant',
        ROLE: 'Rôle',
        EMAIL: 'Email',
        PHONE: 'Téléphone',
        CREATED_AT: 'Date de Création',
      },
      en: {
        REFERENCE: 'Reference',
        USERNAME: 'Username',
        ROLE: 'Role',
        EMAIL: 'Email',
        PHONE: 'Phone',
        CREATED_AT: 'Created At',
      },
    } as const;

    const L = LABELS[lang];

    const users = await this.prisma.user.findMany({
      include: {
        role: {
          select: {
            nameFr: true,
            nameEn: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const data = users.map((user) => ({
      [L.REFERENCE]: `User${String(user.id).padStart(3, '0')}`,
      [L.USERNAME]: user.username,
      [L.ROLE]: useEnglish
        ? (user.role?.nameEn ?? user.role?.nameFr ?? '')
        : (user.role?.nameFr ?? ''),
      [L.EMAIL]: user.email,
      [L.PHONE]: user.phone ?? '',
      [L.CREATED_AT]: user.createdAt.toISOString().split('T')[0],
    }));

    const csv = stringify(data, {
      header: true,
      delimiter: ';', // Excel FR compatible
    });

    // ✨ UTF-8 BOM pour Excel (accents)
    const bom = Buffer.from('\uFEFF', 'utf-8');
    return Buffer.concat([bom, Buffer.from(csv, 'utf-8')]);
  }

  // Update user profile with photo
  async updateProfile(userId: number, dto: UpdateUserProfileDto, photoFile?: Express.Multer.File) {
    try {
      // Get current user
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Check email uniqueness if email is being updated
      if (dto.email && dto.email !== user.email) {
        const emailExists = await this.prisma.user.findUnique({
          where: { email: dto.email },
        });

        if (emailExists) {
          throw new ApiError('Email already exists', 400, 'EMAIL_EXISTS');
        }
      }

      // Handle photo upload
      let photoPath: string | undefined;
      if (photoFile) {
        // Delete old photo if exists
        if (user.photo) {
          await this.fileUploadService.deleteFile(user.photo);
        }

        // Save new photo
        photoPath = await this.fileUploadService.saveFile(
          photoFile,
          FileCategory.USER_PHOTO,
          `user_${userId}`
        );
      }

      // Update user
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          phone: dto.phone,
          position: dto.position,
          department: dto.department,
          cin: dto.cin,
          diploma: dto.diploma,
          ...(photoPath && { photo: photoPath }),
          updatedById: userId,
        },
        include: {
          role: {
            select: {
              id: true,
              code: true,
              nameFr: true,
              nameEn: true,
            },
          },
          company: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      });

      return {
        success: true,
        message: 'Profile updated successfully',
        data: {
          id: updatedUser.id,
          username: updatedUser.username,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          email: updatedUser.email,
          phone: updatedUser.phone,
          position: updatedUser.position,
          department: updatedUser.department,
          cin: updatedUser.cin,
          diploma: updatedUser.diploma,
          photo: updatedUser.photo,
          role: updatedUser.role,
          company: updatedUser.company,
        },
      };
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  // Update company (for accountant and client)
  async updateCompany(userId: number, dto: UpdateCompanyDto, logoFile?: Express.Multer.File) {
    try {
      // Get user with company
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: true,
          company: true,
        },
      });

      if (!user) {
        throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
      }

      if (!user.companyId) {
        throw new ApiError('User is not associated with a company', 400, 'NO_COMPANY');
      }

      // Verify user is accountant or client
      if (user.role?.code !== 'ACCOUNTANT' && user.role?.code !== 'CLIENT') {
        throw new ApiError('Only accountants and clients can update company', 403, 'FORBIDDEN');
      }

      // Handle logo upload
      let logoPath: string | undefined;
      if (logoFile) {
        // Delete old logo if exists
        if (user.company?.logo) {
          await this.fileUploadService.deleteFile(user.company.logo);
        }

        // Save new logo
        logoPath = await this.fileUploadService.saveFile(
          logoFile,
          FileCategory.COMPANY_LOGO,
          `company_${user.companyId}`
        );
      }

      // Update company
      const updatedCompany = await this.prisma.company.update({
        where: { id: user.companyId },
        data: {
          name: dto.name,
          legalName: dto.legalName,
          siret: dto.siret,
          vatNumber: dto.vatNumber,
          legalForm: dto.legalForm,
          address: dto.address,
          city: dto.city,
          postalCode: dto.postalCode,
          country: dto.country,
          phone: dto.phone,
          email: dto.email,
          website: dto.website,
          activityCode: dto.activityCode,
          sector: dto.sector,
          employeeCount: dto.employeeCount,
          description: dto.description,
          ...(logoPath && { logo: logoPath }),
        },
      });

      return {
        success: true,
        message: 'Company updated successfully',
        data: updatedCompany,
      };
    } catch (error) {
      console.error('Update company error:', error);
      throw error;
    }
  }
}
