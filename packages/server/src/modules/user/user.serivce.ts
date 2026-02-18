import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ApiError } from 'src/common/errors/api-error';
import { errors } from 'src/common/errors/errors';
import { UpdateUserDto } from './update-user.dto';
import { Prisma } from '@prisma/client';
import { HashService } from 'src/common/crypto/hash.service';
import { JwtTokenService } from 'src/common/jwt/jwt-token.service';
import * as bcrypt from 'bcrypt';
import { stringify } from 'csv-stringify/sync';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private hashService: HashService,
    private jwtTokenService: JwtTokenService,
  ) { }

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

    if (id_role === 1) {
      throw new ApiError(
        errors.ERR_ANOTHORIZED.message,
        errors.ERR_ANOTHORIZED.code,
        errors.ERR_ANOTHORIZED.errorCode
      );
    }

    const existingUser = await this.prisma.user.findFirst({ where: { email } });
    if (existingUser) {
      throw new ApiError(
        errors.ERR_USER_EXISTS.message,
        errors.ERR_USER_EXISTS.code,
        errors.ERR_USER_EXISTS.errorCode,
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
      const { accessToken, refreshToken } =
        this.jwtTokenService.generateTokens(payload);

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
      throw new ApiError(
        errors.SERVER_ERROR.message,
        errors.SERVER_ERROR.code,
        errors.SERVER_ERROR.errorCode,
      );
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
    currentUserId: number,
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
          errors.NOT_FOUND.errorCode,
        );
      }
    }

    // Verify current user is active
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!currentUser || !currentUser.isActive) {
      throw new ApiError(
        errors.ERR_ANOTHORIZED.message,
        errors.ERR_ANOTHORIZED.code,
        errors.ERR_ANOTHORIZED.errorCode,
      );
    }

    // Find user to update
    const userToUpdate = await this.prisma.user.findUnique({
      where: { id: targetUserId, isActive: true },
      include: { role: true },
    });

    if (!userToUpdate) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode,
      );
    }

    // Prevent updating admin user
    if (userToUpdate.role?.id === 1) {
      throw new ApiError(
        errors.ADMIN_UPDATE_FORBIDDEN.message,
        errors.ADMIN_UPDATE_FORBIDDEN.code,
        errors.ADMIN_UPDATE_FORBIDDEN.errorCode,
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
          errors.ERR_EMAIL_EXISTS.errorCode,
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
        errors.NOT_FOUND.errorCode,
      );
    }

    if (userToDelete.id_role === 1) {
      throw new ApiError(
        errors.FORBIDDEN_DELETE_ADMIN_USER.message,
        errors.FORBIDDEN_DELETE_ADMIN_USER.code,
        errors.FORBIDDEN_DELETE_ADMIN_USER.errorCode,
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
        errors.NOT_FOUND.errorCode,
      );
    }

    if (user.role?.id === 1) {
      throw new ApiError(
        errors.ADMIN_ROLE_UPDATE_FORBIDDEN.message,
        errors.ADMIN_ROLE_UPDATE_FORBIDDEN.code,
        errors.ADMIN_ROLE_UPDATE_FORBIDDEN.errorCode,
      );
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { isActive: !user.isActive },
    });

    return {
      message: updatedUser.isActive
        ? 'User has been activated!'
        : 'User has been deactivated!',
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
}
