import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { ApiError } from 'src/common/errors/api-error';
import { errors } from 'src/common/errors/errors';
import * as bcrypt from 'bcrypt';
import { MailService } from '../mail/mail.service';
import { FileUploadService, FileCategory } from 'src/common/services/file-upload.service';
import { CreateAccountantDto } from './dto/create-accountant.dto';
import { UpdateAccountantDto } from './dto/update-accountant.dto';
import { RoleCode } from 'src/common/enums/role.enum';
import { UserStatus } from 'src/common/enums/user-status.enum';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private fileUploadService: FileUploadService
  ) {}

  // Get all pending accountants
  async getPendingAccountants(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    // Find ACCOUNTANT role by code
    const accountantRole = await this.prisma.role.findUnique({
      where: { code: RoleCode.ACCOUNTANT },
    });

    if (!accountantRole) {
      throw new ApiError('Accountant role not found', 500, 'ROLE_NOT_FOUND');
    }

    const [total, data] = await Promise.all([
      this.prisma.user.count({
        where: {
          id_role: accountantRole.id,
          status: UserStatus.PENDING,
        },
      }),
      this.prisma.user.findMany({
        where: {
          id_role: accountantRole.id,
          status: UserStatus.PENDING,
        },
        skip,
        take: limit,
        include: {
          company: true,
          role: {
            select: {
              nameFr: true,
              nameEn: true,
              code: true,
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

  // Get all accountants
  async getAllAccountants(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;

    // Find ACCOUNTANT role by code
    const accountantRole = await this.prisma.role.findUnique({
      where: { code: RoleCode.ACCOUNTANT },
    });

    if (!accountantRole) {
      throw new ApiError('Accountant role not found', 500, 'ROLE_NOT_FOUND');
    }

    const where: any = {
      id_role: accountantRole.id,
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          company: true,
          role: {
            select: {
              nameFr: true,
              nameEn: true,
              code: true,
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

  // Get accountant by ID
  async getAccountantById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        company: true,
        role: {
          select: {
            nameFr: true,
            nameEn: true,
            code: true,
          },
        },
      },
    });

    if (!user) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode
      );
    }

    // Check if user is accountant by role code
    if (user.role?.code !== RoleCode.ACCOUNTANT) {
      throw new ApiError('User is not an accountant', 400, 'INVALID_ROLE');
    }

    return {
      success: true,
      data: user,
    };
  }

  // Activate any user account (admin can activate all accounts)
  async activateAccountant(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { company: true, role: true },
    });

    if (!user) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode
      );
    }

    // Prevent activating admin accounts (they should always be active)
    if (user.role?.code === RoleCode.ADMIN) {
      throw new ApiError('Administrator accounts are always active', 400, 'ADMIN_ALWAYS_ACTIVE');
    }

    // Update user status
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.ACTIVE,
      },
    });

    // Update company status if user has a company
    if (user.companyId) {
      await this.prisma.company.update({
        where: { id: user.companyId },
        data: { status: UserStatus.ACTIVE },
      });
    }

    // Send activation email
    if (user.firstName && user.email) {
      try {
        await this.mailService.sendAccountActivationEmail(user.email, user.firstName);
      } catch (error) {
        console.error('Failed to send activation email:', error);
      }
    }

    return {
      success: true,
      message: 'User account activated successfully',
      data: updatedUser,
    };
  }

  // Suspend any user account (admin can suspend all accounts)
  async suspendAccountant(id: number, reason?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
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
    if (user.role?.code === RoleCode.ADMIN) {
      throw new ApiError('Cannot suspend administrator accounts', 403, 'FORBIDDEN_SUSPEND_ADMIN');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.SUSPENDED,
      },
    });

    // Send suspension email
    if (user.firstName && user.email) {
      try {
        await this.mailService.sendAccountSuspensionEmail(user.email, user.firstName, reason);
      } catch (error) {
        console.error('Failed to send suspension email:', error);
      }
    }

    return {
      success: true,
      message: 'User account suspended successfully',
      data: updatedUser,
    };
  }

  // Create accountant by admin
  async createAccountant(
    dto: CreateAccountantDto,
    files?: { patentFile?: Express.Multer.File[]; rneFile?: Express.Multer.File[] }
  ) {
    const { email, phone, firmName, password, status = UserStatus.ACTIVE, specialties } = dto;

    try {
      // Check if email already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new ApiError('Email already exists', 400, 'EMAIL_EXISTS');
      }

      // Find ACCOUNTANT role by code
      const accountantRole = await this.prisma.role.findUnique({
        where: { code: RoleCode.ACCOUNTANT },
      });

      if (!accountantRole) {
        throw new ApiError('Accountant role not found', 500, 'ROLE_NOT_FOUND');
      }

      // Hash the provided password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Handle file uploads using FileUploadService
      let patentFilePath: string | undefined;
      let rneFilePath: string | undefined;

      if (files?.patentFile && files.patentFile[0]) {
        patentFilePath = await this.fileUploadService.saveFile(
          files.patentFile[0],
          FileCategory.ACCOUNTANT_PATENT
        );
      }

      if (files?.rneFile && files.rneFile[0]) {
        rneFilePath = await this.fileUploadService.saveFile(
          files.rneFile[0],
          FileCategory.ACCOUNTANT_RNE
        );
      }

      // Convert specialties to array if it's a string
      let specialtiesArray: string[] = [];
      if (specialties) {
        if (Array.isArray(specialties)) {
          specialtiesArray = specialties;
        } else if (typeof specialties === 'string') {
          specialtiesArray = [specialties];
        }
      }

      // Create accounting firm
      const firm = await this.prisma.company.create({
        data: {
          name: firmName,
          patentFile: patentFilePath,
          rne: rneFilePath,
          phone,
          type: 'accounting_firm',
          status: status === UserStatus.ACTIVE ? UserStatus.ACTIVE : UserStatus.PENDING,
          specialties: specialtiesArray,
        },
      });

      // Extract username from email (part before @)
      const username = email.split('@')[0];

      // Create user with role accountant
      const user = await this.prisma.user.create({
        data: {
          username,
          email,
          password: hashedPassword,
          phone,
          companyId: firm.id,
          id_role: accountantRole.id,
          status,
        },
      });

      // Update company owner
      await this.prisma.company.update({
        where: { id: firm.id },
        data: { ownerId: user.id },
      });

      // Send welcome email with password
      try {
        await this.mailService.sendAccountCreatedWithPasswordEmail(
          email,
          username,
          password, // Send the plain password before hashing
          firmName,
          'Comptable'
        );
      } catch (error) {
        console.error('Failed to send welcome email:', error);
      }

      return {
        success: true,
        message: 'Accountant created successfully. Welcome email sent.',
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          phone: user.phone,
          status: user.status,
          company: {
            id: firm.id,
            name: firm.name,
            patentFile: firm.patentFile,
            rne: firm.rne,
            specialties: firm.specialties,
          },
        },
      };
    } catch (error) {
      console.error('Create accountant error:', error);
      throw error;
    }
  }

  // Update accountant
  async updateAccountant(id: number, dto: UpdateAccountantDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true, company: true },
    });

    if (!user) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode
      );
    }

    // Check if user is accountant by role code
    if (user.role?.code !== RoleCode.ACCOUNTANT) {
      throw new ApiError('User is not an accountant', 400, 'INVALID_ROLE');
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

    // Update user
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        email: dto.email,
        phone: dto.phone,
      },
    });

    // Update company phone if provided
    if (user.companyId && dto.phone) {
      await this.prisma.company.update({
        where: { id: user.companyId },
        data: {
          phone: dto.phone,
        },
      });
    }

    return {
      success: true,
      message: 'Accountant updated successfully',
      data: updatedUser,
    };
  }

  // Delete accountant
  async deleteAccountant(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true, company: true },
    });

    if (!user) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode
      );
    }

    // Check if user is accountant by role code
    if (user.role?.code !== RoleCode.ACCOUNTANT) {
      throw new ApiError('User is not an accountant', 400, 'INVALID_ROLE');
    }

    // Delete user
    await this.prisma.user.delete({
      where: { id },
    });

    // Optionally delete company if no other users
    if (user.companyId) {
      const companyUsers = await this.prisma.user.count({
        where: { companyId: user.companyId },
      });

      if (companyUsers === 0) {
        await this.prisma.company.delete({
          where: { id: user.companyId },
        });
      }
    }

    return {
      success: true,
      message: 'Accountant deleted successfully',
    };
  }

  // Get accountant file
  async getAccountantFile(id: number, fileType: 'patent' | 'rne') {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { company: true, role: true },
    });

    if (!user) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode
      );
    }

    // Check if user is accountant by role code
    if (user.role?.code !== RoleCode.ACCOUNTANT) {
      throw new ApiError('User is not an accountant', 400, 'INVALID_ROLE');
    }

    if (!user.company) {
      throw new ApiError('Company not found', 404, 'COMPANY_NOT_FOUND');
    }

    const filePath = fileType === 'patent' ? user.company.patentFile : user.company.rne;

    if (!filePath) {
      throw new ApiError(`${fileType} file not found`, 404, 'FILE_NOT_FOUND');
    }

    return {
      success: true,
      data: {
        fileType,
        filePath,
        url: `${process.env.BACKEND_URL || 'http://localhost:3000'}/${filePath}`,
      },
    };
  }
}
