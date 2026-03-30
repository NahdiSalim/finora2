import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ApiError } from 'src/common/errors/api-error';
import { errors } from 'src/common/errors/errors';
import { MSG } from 'src/common/messages';
import { UpdateUserDto } from './update-user.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Prisma } from '@prisma/client';
import { JwtTokenService } from 'src/common/jwt/jwt-token.service';
import { MinioService } from 'src/common/services/minio.service';
import { UserStatus } from 'src/common/enums/user-status.enum';
import * as bcrypt from 'bcrypt';
import { stringify } from 'csv-stringify/sync';
import { RoleCode } from 'src/common/enums/role.enum';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private jwtTokenService: JwtTokenService,
    private minioService: MinioService
  ) {}

  async getAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    role?: string,
    status?: string
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = { code: { equals: role.toUpperCase() } };
    }

    if (status) {
      where.status = status;
    }

    const [total, data, roleCounts] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          photo: true,
          status: true,
          isActive: true,
          createdAt: true,
          role: { select: { code: true, nameFr: true, nameEn: true } },
          company: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user
        .groupBy({
          by: ['id_role'],
          _count: { id: true },
          where: {
            role: {
              code: { in: ['ACCOUNTANT', 'COLLABORATOR', 'CLIENT'] },
            },
          },
        })
        .then(async (groups) => {
          const roles = await this.prisma.role.findMany({
            where: { code: { in: ['ACCOUNTANT', 'COLLABORATOR', 'CLIENT'] } },
            select: { id: true, code: true },
          });
          const map: Record<string, number> = { ACCOUNTANT: 0, COLLABORATOR: 0, CLIENT: 0 };
          for (const g of groups) {
            const r = roles.find((r) => r.id === g.id_role);
            if (r) map[r.code] = g._count.id;
          }
          return map;
        }),
    ]);

    return {
      success: true,
      data,
      counts: roleCounts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
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

  async getById(id: number, currentUserId?: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        photo: true,
        coverPhoto: true,
        cin: true,
        diploma: true,
        position: true,
        department: true,
        status: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        role: { select: { id: true, code: true, nameFr: true, nameEn: true } },
        company: {
          select: {
            id: true,
            name: true,
            legalName: true,
            email: true,
            phone: true,
            numWhatsapp: true,
            address: true,
            city: true,
            postalCode: true,
            country: true,
            countryCode: true,
            website: true,
            siret: true,
            vatNumber: true,
            legalForm: true,
            rne: true,
            rneFile: true,
            patentNumber: true,
            patentFile: true,
            creationDate: true,
            capital: true,
            activityCode: true,
            sector: true,
            employeeCount: true,
            type: true,
            description: true,
            experience: true,
            specialties: true,
            rating: true,
            numberOfReviews: true,
            logo: true,
            status: true,
            createdAt: true,
          },
        },
        documents: {
          where: { isFolder: false, status: 'active' },
          select: {
            id: true,
            name: true,
            type: true,
            category: true,
            size: true,
            url: true,
            processingStatus: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!user) throw new ApiError(MSG.user.not_found, 404, 'NOT_FOUND');

    const roleCode = user.role?.code;
    const PRESIGN_TTL = 7 * 24 * 60 * 60; // 7 days

    const presign = async (path: string | null | undefined): Promise<string | null> => {
      if (!path) return null;
      try {
        return await this.minioService.getPresignedUrl(path, PRESIGN_TTL);
      } catch {
        return path;
      }
    };

    // ── COLLABORATOR ──────────────────────────────────────────────────────────
    if (roleCode === RoleCode.COLLABORATOR) {
      const photoUrl = await presign(user.photo);
      const coverPhotoUrl = await presign(user.coverPhoto);

      return {
        success: true,
        data: {
          id: user.id,
          id_role: user.role?.id ?? null,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          companyId: user.company?.id ?? null,
          position: user.position,
          department: user.department,
          cin: user.cin,
          diploma: user.diploma,
          photo: photoUrl,
          coverPhoto: coverPhotoUrl,
          lastLogin: user.lastLogin,
          isActive: user.isActive,
          status: user.status,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          role: user.role
            ? { nameFr: user.role.nameFr, nameEn: user.role.nameEn, code: user.role.code }
            : null,
        },
      };
    }

    // ── ACCOUNTANT ────────────────────────────────────────────────────────────
    if (roleCode === RoleCode.ACCOUNTANT) {
      const photoUrl = await presign(user.photo);
      const coverPhotoUrl = await presign(user.coverPhoto);
      const logoUrl = await presign(user.company?.logo);
      const patentFileUrl = await presign(user.company?.patentFile);

      const rneFilePath =
        user.company?.rneFile || (user.company?.rne?.includes('/') ? user.company.rne : null);
      const rneFileUrl = await presign(rneFilePath);

      return {
        success: true,
        data: {
          id: user.id,
          name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          photoUrl,
          coverPhotoUrl,
          specialty: user.position,
          department: user.department,
          diploma: user.diploma,
          company: user.company
            ? {
                id: user.company.id,
                name: user.company.name,
                description: user.company.description,
                experience: user.company.experience,
                employeeCount: user.company.employeeCount
                  ? String(user.company.employeeCount)
                  : null,
                sector: user.company.sector,
                city: user.company.city,
                address: user.company.address,
                postalCode: user.company.postalCode,
                phone: user.company.phone,
                numWhatsapp: user.company.numWhatsapp,
                email: user.company.email,
                website: user.company.website,
                siret: user.company.siret,
                vatNumber: user.company.vatNumber,
                legalForm: user.company.legalForm,
                patentNumber: user.company.patentNumber,
                patentFileUrl,
                rne: user.company.rne?.includes('/') ? null : user.company.rne,
                rneFileUrl,
                logoUrl,
                specialties: user.company.specialties || [],
                rating: user.company.rating || 0,
                numberOfReviews: user.company.numberOfReviews || 0,
              }
            : null,
        },
      };
    }

    // ── CLIENT ────────────────────────────────────────────────────────────────
    if (roleCode === RoleCode.CLIENT) {
      const patentFileUrl = await presign(user.company?.patentFile);

      // Fetch relationship with the current user's company (if caller is an accountant)
      let relationshipStatus: string | null = null;
      let relationshipStart: Date | null = null;
      if (currentUserId && currentUserId !== id && user.company?.id) {
        const caller = await this.prisma.user.findUnique({
          where: { id: currentUserId },
          select: { companyId: true },
        });
        if (caller?.companyId) {
          const rel = await this.prisma.clientAccountingFirmRelationship.findFirst({
            where: {
              clientCompanyId: user.company.id,
              accountingFirmId: caller.companyId,
            },
            select: { status: true, relationshipStart: true },
            orderBy: { createdAt: 'desc' },
          });
          if (rel) {
            relationshipStatus = rel.status;
            relationshipStart = rel.relationshipStart;
          }
        }
      }

      return {
        success: true,
        data: {
          id: user.id,
          fullName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
          email: user.email,
          phone: user.phone,
          company: user.company
            ? {
                name: user.company.name,
                siret: user.company.siret,
                vatNumber: user.company.vatNumber,
                legalForm: user.company.legalForm,
                address: user.company.address,
                city: user.company.city,
                postalCode: user.company.postalCode,
                country: user.company.country,
                patentFile: user.company.patentFile,
                patentFileUrl,
              }
            : null,
          status: user.status,
          relationshipStatus,
          relationshipStart,
          createdAt: user.createdAt,
        },
      };
    }

    // ── Fallback (ADMINISTRATOR, etc.) ────────────────────────────────────────
    return { success: true, data: user };
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

  async updateUserStatus(targetUserId: number, action: 'activate' | 'suspend', reason?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { role: true },
    });

    if (!user) throw new ApiError(MSG.user.not_found, 404, 'NOT_FOUND');
    if (user.role?.id === 1) throw new ApiError(MSG.auth.forbidden, 403, 'FORBIDDEN');

    const newStatus = action === 'activate' ? UserStatus.ACTIVE : UserStatus.SUSPENDED;

    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { status: newStatus },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
      },
    });

    const message = newStatus === UserStatus.ACTIVE ? MSG.user.activated : MSG.user.suspended;
    return { success: true, message, data: updatedUser };
  }

  async toggleActive(targetUserId: number) {
    return this.updateUserStatus(targetUserId, 'activate');
  }

  async suspendUser(targetUserId: number, reason?: string) {
    return this.updateUserStatus(targetUserId, 'suspend', reason);
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
  async updateProfile(
    userId: number,
    dto: UpdateUserProfileDto,
    photoFile?: Express.Multer.File,
    coverPhotoFile?: Express.Multer.File
  ) {
    try {
      // Get current user
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
      }

      console.log('User found:', user.email);

      // Check email uniqueness if email is being updated
      if (dto.email && dto.email !== user.email) {
        const emailExists = await this.prisma.user.findUnique({
          where: { email: dto.email },
        });

        if (emailExists) {
          throw new ApiError('Email already exists', 400, 'EMAIL_EXISTS');
        }
      }

      // Handle photo upload to MinIO
      let photoPath: string | undefined;
      if (photoFile && user.companyId) {
        console.log('Processing photo upload to MinIO...');
        try {
          // Delete old photo from MinIO if exists
          if (user.photo) {
            try {
              await this.minioService.deleteFile(user.photo);
            } catch (deleteError) {
              console.log('Could not delete old photo:', deleteError);
              // Continue anyway
            }
          }

          // Upload new photo to MinIO
          photoPath = await this.minioService.uploadFile(user.companyId, 'users/photos', photoFile);
          console.log('Photo uploaded successfully to MinIO:', photoPath);
        } catch (photoError) {
          console.error('Photo upload error:', photoError);
          // Continue without photo if upload fails
          photoPath = undefined;
        }
      } else if (photoFile && !user.companyId) {
        console.log('User has no company, cannot upload to MinIO');
      }

      // Handle cover photo upload to MinIO
      let coverPhotoPath: string | undefined;
      if (coverPhotoFile && user.companyId) {
        console.log('Processing cover photo upload to MinIO...');
        try {
          // Delete old cover photo from MinIO if exists
          if (user.coverPhoto) {
            try {
              await this.minioService.deleteFile(user.coverPhoto);
            } catch (deleteError) {
              console.log('Could not delete old cover photo:', deleteError);
              // Continue anyway
            }
          }

          // Upload new cover photo to MinIO
          coverPhotoPath = await this.minioService.uploadFile(
            user.companyId,
            'users/cover-photos',
            coverPhotoFile
          );
        } catch (coverPhotoError) {
          console.error('Cover photo upload error:', coverPhotoError);
          // Continue without cover photo if upload fails
          coverPhotoPath = undefined;
        }
      } else if (coverPhotoFile && !user.companyId) {
        console.log('User has no company, cannot upload cover photo to MinIO');
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
          ...(coverPhotoPath && { coverPhoto: coverPhotoPath }),
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

      // Generate presigned URL for photo if exists
      let photoUrl: string | null = null;
      if (updatedUser.photo) {
        try {
          photoUrl = await this.minioService.getPresignedUrl(updatedUser.photo, 7 * 24 * 60 * 60); // 7 days
        } catch (error) {
          console.error('Error generating presigned URL:', error);
          photoUrl = updatedUser.photo; // Fallback to path
        }
      }

      // Generate presigned URL for cover photo if exists
      let coverPhotoUrl: string | null = null;
      if (updatedUser.coverPhoto) {
        try {
          coverPhotoUrl = await this.minioService.getPresignedUrl(
            updatedUser.coverPhoto,
            7 * 24 * 60 * 60
          ); // 7 days
        } catch (error) {
          console.error('Error generating presigned URL for cover photo:', error);
          coverPhotoUrl = updatedUser.coverPhoto; // Fallback to path
        }
      }

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
          photoUrl: photoUrl, // URL présignée MinIO
          coverPhotoUrl: coverPhotoUrl, // URL présignée MinIO
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

      // Check SIRET uniqueness if being updated
      if (dto.siret && dto.siret !== user.company?.siret) {
        const siretExists = await this.prisma.company.findFirst({
          where: {
            siret: dto.siret,
            id: { not: user.companyId },
          },
        });

        if (siretExists) {
          throw new ApiError('SIRET number already exists', 400, 'SIRET_EXISTS');
        }
      }

      // Handle logo upload to MinIO
      let logoPath: string | undefined;
      if (logoFile) {
        try {
          // Delete old logo from MinIO if exists
          if (user.company?.logo) {
            try {
              await this.minioService.deleteFile(user.company.logo);
            } catch (deleteError) {
              console.log('Could not delete old logo:', deleteError);
              // Continue anyway
            }
          }

          // Upload new logo to MinIO
          logoPath = await this.minioService.uploadFile(
            user.companyId,
            'companies/logos',
            logoFile
          );
        } catch (logoError) {
          console.error('Logo upload error:', logoError);
          // Continue without logo if upload fails
          logoPath = undefined;
        }
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
          numWhatsapp: dto.numWhatsapp,
          email: dto.email,
          website: dto.website,
          activityCode: dto.activityCode,
          sector: dto.sector,
          employeeCount: dto.employeeCount,
          experience: dto.experience,
          description: dto.description,
          ...(logoPath && { logo: logoPath }),
        },
      });

      // Generate presigned URL for logo if exists
      let logoUrl: string | null = null;
      if (updatedCompany.logo) {
        try {
          logoUrl = await this.minioService.getPresignedUrl(updatedCompany.logo, 7 * 24 * 60 * 60); // 7 days
        } catch (error) {
          console.error('Error generating presigned URL for logo:', error);
          logoUrl = updatedCompany.logo; // Fallback to path
        }
      }

      // Remove internal logo path and return only the presigned URL
      const { logo, ...companyData } = updatedCompany;

      return {
        success: true,
        message: 'Company updated successfully',
        data: {
          ...companyData,
          logoUrl: logoUrl, // URL présignée MinIO
        },
      };
    } catch (error) {
      console.error('Update company error:', error);
      throw error;
    }
  }

  // UNIFIED: Update complete profile (user + company + documents)
  async updateCompleteProfile(
    userId: number,
    data: {
      // User fields
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      position?: string;
      department?: string;
      cin?: string;
      diploma?: string;
      // Company fields
      companyName?: string;
      companyLegalName?: string;
      companySiret?: string;
      companyVatNumber?: string;
      companyLegalForm?: string;
      companyAddress?: string;
      companyCity?: string;
      companyPostalCode?: string;
      companyCountry?: string;
      companyPhone?: string;
      companyNumWhatsapp?: string;
      companyEmail?: string;
      companyWebsite?: string;
      companyDescription?: string;
      companyExperience?: string;
      companyActivityCode?: string;
      companySector?: string;
      companyEmployeeCount?: number;
      companySpecialties?: string | string[];
      companyPatentNumber?: string;
    },
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
    try {
      // Get current user
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { company: true },
      });

      if (!user) {
        throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Check email uniqueness if email is being updated
      if (data.email && data.email !== user.email) {
        const emailExists = await this.prisma.user.findUnique({
          where: { email: data.email },
        });

        if (emailExists) {
          throw new ApiError('Email already exists', 400, 'EMAIL_EXISTS');
        }
      }

      // ========== UPLOAD USER FILES TO MINIO ==========
      let photoPath: string | undefined;
      if (files?.photo && files.photo[0] && user.companyId) {
        try {
          if (user.photo) {
            await this.minioService.deleteFile(user.photo).catch(() => {});
          }
          photoPath = await this.minioService.uploadFile(
            user.companyId,
            'users/photos',
            files.photo[0]
          );
        } catch (error) {
          console.error('Photo upload error:', error);
        }
      }

      let coverPhotoPath: string | undefined;
      if (files?.coverPhoto && files.coverPhoto[0] && user.companyId) {
        try {
          if (user.coverPhoto) {
            await this.minioService.deleteFile(user.coverPhoto).catch(() => {});
          }
          coverPhotoPath = await this.minioService.uploadFile(
            user.companyId,
            'users/cover-photos',
            files.coverPhoto[0]
          );
        } catch (error) {
          console.error('Cover photo upload error:', error);
        }
      }

      let cinFilePath: string | undefined;
      if (files?.cinFile && files.cinFile[0] && user.companyId) {
        try {
          cinFilePath = await this.minioService.uploadFile(
            user.companyId,
            'users/documents/cin',
            files.cinFile[0]
          );
        } catch (error) {
          console.error('CIN file upload error:', error);
        }
      }

      let diplomaFilePath: string | undefined;
      if (files?.diplomaFile && files.diplomaFile[0] && user.companyId) {
        try {
          diplomaFilePath = await this.minioService.uploadFile(
            user.companyId,
            'users/documents/diplomas',
            files.diplomaFile[0]
          );
        } catch (error) {
          console.error('Diploma file upload error:', error);
        }
      }

      // ========== UPDATE USER ==========
      const userUpdateData: any = {};
      if (data.firstName !== undefined) userUpdateData.firstName = data.firstName;
      if (data.lastName !== undefined) userUpdateData.lastName = data.lastName;
      if (data.email !== undefined) userUpdateData.email = data.email;
      if (data.phone !== undefined) userUpdateData.phone = data.phone;
      if (data.position !== undefined) userUpdateData.position = data.position;
      if (data.department !== undefined) userUpdateData.department = data.department;
      if (data.cin !== undefined) userUpdateData.cin = data.cin;
      if (data.diploma !== undefined) userUpdateData.diploma = data.diploma;
      if (photoPath) userUpdateData.photo = photoPath;
      if (coverPhotoPath) userUpdateData.coverPhoto = coverPhotoPath;
      if (cinFilePath) userUpdateData.cinFile = cinFilePath;
      if (diplomaFilePath) userUpdateData.diplomaFile = diplomaFilePath;
      userUpdateData.updatedById = userId;

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: userUpdateData,
      });

      // ========== UPDATE COMPANY (if user has company) ==========
      let updatedCompany: any = null;
      if (user.companyId) {
        // Check SIRET uniqueness if being updated
        if (data.companySiret && data.companySiret !== user.company?.siret) {
          const siretExists = await this.prisma.company.findFirst({
            where: {
              siret: data.companySiret,
              id: { not: user.companyId },
            },
          });

          if (siretExists) {
            throw new ApiError('SIRET number already exists', 400, 'SIRET_EXISTS');
          }
        }

        // Upload company files
        let logoPath: string | undefined;
        if (files?.companyLogo && files.companyLogo[0]) {
          try {
            if (user.company?.logo) {
              await this.minioService.deleteFile(user.company.logo).catch(() => {});
            }
            logoPath = await this.minioService.uploadFile(
              user.companyId,
              'companies/logos',
              files.companyLogo[0]
            );
          } catch (error) {
            console.error('Logo upload error:', error);
          }
        }

        let patentFilePath: string | undefined;
        if (files?.companyPatentFile && files.companyPatentFile[0]) {
          try {
            if (user.company?.patentFile) {
              await this.minioService.deleteFile(user.company.patentFile).catch(() => {});
            }
            patentFilePath = await this.minioService.uploadFile(
              user.companyId,
              'companies/documents/patents',
              files.companyPatentFile[0]
            );
          } catch (error) {
            console.error('Patent file upload error:', error);
          }
        }

        let rneFilePath: string | undefined;
        if (files?.companyRneFile && files.companyRneFile[0]) {
          try {
            if (user.company?.rne) {
              await this.minioService.deleteFile(user.company.rne).catch(() => {});
            }
            rneFilePath = await this.minioService.uploadFile(
              user.companyId,
              'companies/documents/rne',
              files.companyRneFile[0]
            );
          } catch (error) {
            console.error('RNE file upload error:', error);
          }
        }

        // Build company update data
        const companyUpdateData: any = {};
        if (data.companyName !== undefined) companyUpdateData.name = data.companyName;
        if (data.companyLegalName !== undefined)
          companyUpdateData.legalName = data.companyLegalName;
        if (data.companySiret !== undefined) companyUpdateData.siret = data.companySiret;
        if (data.companyVatNumber !== undefined)
          companyUpdateData.vatNumber = data.companyVatNumber;
        if (data.companyLegalForm !== undefined)
          companyUpdateData.legalForm = data.companyLegalForm;
        if (data.companyAddress !== undefined) companyUpdateData.address = data.companyAddress;
        if (data.companyCity !== undefined) companyUpdateData.city = data.companyCity;
        if (data.companyPostalCode !== undefined)
          companyUpdateData.postalCode = data.companyPostalCode;
        if (data.companyCountry !== undefined) companyUpdateData.country = data.companyCountry;
        if (data.companyPhone !== undefined) companyUpdateData.phone = data.companyPhone;
        if (data.companyNumWhatsapp !== undefined)
          companyUpdateData.numWhatsapp = data.companyNumWhatsapp;
        if (data.companyEmail !== undefined) companyUpdateData.email = data.companyEmail;
        if (data.companyWebsite !== undefined) companyUpdateData.website = data.companyWebsite;
        if (data.companyDescription !== undefined)
          companyUpdateData.description = data.companyDescription;
        if (data.companyExperience !== undefined)
          companyUpdateData.experience = data.companyExperience;
        if (data.companyActivityCode !== undefined)
          companyUpdateData.activityCode = data.companyActivityCode;
        if (data.companySector !== undefined) companyUpdateData.sector = data.companySector;
        if (data.companyEmployeeCount !== undefined)
          companyUpdateData.employeeCount = data.companyEmployeeCount;
        if (data.companyPatentNumber !== undefined)
          companyUpdateData.patentNumber = data.companyPatentNumber;
        if (logoPath) companyUpdateData.logo = logoPath;
        if (patentFilePath) companyUpdateData.patentFile = patentFilePath;
        if (rneFilePath) companyUpdateData.rne = rneFilePath;

        // Handle specialties
        if (data.companySpecialties !== undefined) {
          let specialtiesArray: string[] = [];
          if (typeof data.companySpecialties === 'string') {
            specialtiesArray = data.companySpecialties.split(',').map((s) => s.trim());
          } else if (Array.isArray(data.companySpecialties)) {
            specialtiesArray = data.companySpecialties;
          }
          companyUpdateData.specialties = specialtiesArray;
        }

        updatedCompany = await this.prisma.company.update({
          where: { id: user.companyId },
          data: companyUpdateData,
        });
      }

      // ========== GENERATE PRESIGNED URLS ==========
      let photoUrl: string | null = null;
      if (updatedUser.photo) {
        try {
          photoUrl = await this.minioService.getPresignedUrl(updatedUser.photo, 7 * 24 * 60 * 60);
        } catch (error) {
          console.error('Error generating presigned URL for photo:', error);
        }
      }

      let coverPhotoUrl: string | null = null;
      if (updatedUser.coverPhoto) {
        try {
          coverPhotoUrl = await this.minioService.getPresignedUrl(
            updatedUser.coverPhoto,
            7 * 24 * 60 * 60
          );
        } catch (error) {
          console.error('Error generating presigned URL for cover photo:', error);
        }
      }

      let cinFileUrl: string | null = null;
      if ((updatedUser as any).cinFile) {
        try {
          cinFileUrl = await this.minioService.getPresignedUrl(
            (updatedUser as any).cinFile,
            7 * 24 * 60 * 60
          );
        } catch (error) {
          console.error('Error generating presigned URL for CIN file:', error);
        }
      }

      let diplomaFileUrl: string | null = null;
      if ((updatedUser as any).diplomaFile) {
        try {
          diplomaFileUrl = await this.minioService.getPresignedUrl(
            (updatedUser as any).diplomaFile,
            7 * 24 * 60 * 60
          );
        } catch (error) {
          console.error('Error generating presigned URL for diploma file:', error);
        }
      }

      let logoUrl: string | null = null;
      if (updatedCompany?.logo) {
        try {
          logoUrl = await this.minioService.getPresignedUrl(updatedCompany.logo, 7 * 24 * 60 * 60);
        } catch (error) {
          console.error('Error generating presigned URL for logo:', error);
        }
      }

      let patentFileUrl: string | null = null;
      if (updatedCompany?.patentFile) {
        try {
          patentFileUrl = await this.minioService.getPresignedUrl(
            updatedCompany.patentFile,
            7 * 24 * 60 * 60
          );
        } catch (error) {
          console.error('Error generating presigned URL for patent file:', error);
        }
      }

      let rneFileUrl: string | null = null;
      if (updatedCompany?.rne) {
        try {
          rneFileUrl = await this.minioService.getPresignedUrl(
            updatedCompany.rne,
            7 * 24 * 60 * 60
          );
        } catch (error) {
          console.error('Error generating presigned URL for RNE file:', error);
        }
      }

      return {
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: {
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
            photoUrl,
            coverPhotoUrl,
            cinFileUrl,
            diplomaFileUrl,
          },
          company: updatedCompany
            ? {
                id: updatedCompany.id,
                name: updatedCompany.name,
                legalName: updatedCompany.legalName,
                siret: updatedCompany.siret,
                vatNumber: updatedCompany.vatNumber,
                legalForm: updatedCompany.legalForm,
                address: updatedCompany.address,
                city: updatedCompany.city,
                postalCode: updatedCompany.postalCode,
                country: updatedCompany.country,
                phone: updatedCompany.phone,
                email: updatedCompany.email,
                website: updatedCompany.website,
                description: updatedCompany.description,
                experience: updatedCompany.experience,
                activityCode: updatedCompany.activityCode,
                sector: updatedCompany.sector,
                employeeCount: updatedCompany.employeeCount,
                specialties: updatedCompany.specialties,
                patentNumber: updatedCompany.patentNumber,
                logoUrl,
                patentFileUrl,
                rneFileUrl,
              }
            : null,
        },
      };
    } catch (error) {
      console.error('Update complete profile error:', error);
      throw error;
    }
  }
}
