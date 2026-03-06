import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { ApiError } from 'src/common/errors/api-error';
import * as bcrypt from 'bcrypt';
import { MailService } from '../mail/mail.service';
import { MinioService } from 'src/common/services/minio.service';
import { CreateCollaboratorDto } from './dto/create-collaborator.dto';
import { CreateClientDto } from './dto/create-client.dto';
import { RoleCode } from 'src/common/enums/role.enum';
import { UserStatus } from 'src/common/enums/user-status.enum';

@Injectable()
export class AccountantService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private minioService: MinioService
  ) {}

  // Create collaborator (by accountant)
  async createCollaborator(accountantId: number, dto: CreateCollaboratorDto) {
    const { firstName, lastName, email, phone, position, department, password } = dto;

    try {
      // Get accountant user with company
      const accountant = await this.prisma.user.findUnique({
        where: { id: accountantId },
        include: { role: true, company: true },
      });

      if (!accountant) {
        throw new ApiError('Accountant not found', 404, 'ACCOUNTANT_NOT_FOUND');
      }

      // Verify accountant role
      if (accountant.role?.code !== RoleCode.ACCOUNTANT) {
        throw new ApiError('Only accountants can create collaborators', 403, 'FORBIDDEN');
      }

      // Verify accountant has a company
      if (!accountant.companyId) {
        throw new ApiError('Accountant must be associated with a company', 400, 'NO_COMPANY');
      }

      // Check if email already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new ApiError('Email already exists', 400, 'EMAIL_EXISTS');
      }

      // Find COLLABORATOR role
      const collaboratorRole = await this.prisma.role.findUnique({
        where: { code: RoleCode.COLLABORATOR },
      });

      if (!collaboratorRole) {
        throw new ApiError('Collaborator role not found', 500, 'ROLE_NOT_FOUND');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Generate username from email
      const username = email.split('@')[0];

      // Create collaborator user
      const collaborator = await this.prisma.user.create({
        data: {
          username,
          firstName,
          lastName,
          email,
          password: hashedPassword,
          phone,
          position,
          department,
          companyId: accountant.companyId,
          id_role: collaboratorRole.id,
          status: UserStatus.ACTIVE,
          createdById: accountantId,
        },
        include: {
          role: {
            select: {
              nameFr: true,
              nameEn: true,
              code: true,
            },
          },
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Send welcome email with password
      try {
        await this.mailService.sendAccountCreatedWithPasswordEmail(
          email,
          `${firstName} ${lastName}`,
          password, // Send the plain password before hashing
          accountant.company?.name || 'Cabinet',
          'Collaborateur'
        );
      } catch (error) {
        console.error('Failed to send welcome email:', error);
      }

      return {
        success: true,
        message: 'Collaborator created successfully',
        data: {
          id: collaborator.id,
          username: collaborator.username,
          firstName: collaborator.firstName,
          lastName: collaborator.lastName,
          email: collaborator.email,
          phone: collaborator.phone,
          position: collaborator.position,
          department: collaborator.department,
          status: collaborator.status,
          role: collaborator.role,
          company: collaborator.company,
        },
      };
    } catch (error) {
      console.error('Create collaborator error:', error);
      throw error;
    }
  }

  // Create client (by accountant) with automatic relationship
  async createClient(accountantId: number, dto: CreateClientDto) {
    const {
      firstName,
      lastName,
      email,
      phone,
      companyName,
      siret,
      vatNumber,
      legalForm,
      address,
      city,
      postalCode,
      password,
    } = dto;

    try {
      // Get accountant user with company
      const accountant = await this.prisma.user.findUnique({
        where: { id: accountantId },
        include: { role: true, company: true },
      });

      if (!accountant) {
        throw new ApiError('Accountant not found', 404, 'ACCOUNTANT_NOT_FOUND');
      }

      // Verify accountant role
      if (accountant.role?.code !== RoleCode.ACCOUNTANT) {
        throw new ApiError('Only accountants can create clients', 403, 'FORBIDDEN');
      }

      // Verify accountant has a company
      if (!accountant.companyId) {
        throw new ApiError('Accountant must be associated with a company', 400, 'NO_COMPANY');
      }

      // Check if email already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new ApiError('Email already exists', 400, 'EMAIL_EXISTS');
      }

      // Check if SIRET already exists (if provided)
      if (siret) {
        const existingCompany = await this.prisma.company.findUnique({
          where: { siret },
        });

        if (existingCompany) {
          throw new ApiError('SIRET already exists', 400, 'SIRET_EXISTS');
        }
      }

      // Find CLIENT role
      const clientRole = await this.prisma.role.findUnique({
        where: { code: RoleCode.CLIENT },
      });

      if (!clientRole) {
        throw new ApiError('Client role not found', 500, 'ROLE_NOT_FOUND');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Generate username from email
      const username = email.split('@')[0];

      // Create client company
      const clientCompany = await this.prisma.company.create({
        data: {
          name: companyName,
          siret: siret || null, // Allow null if not provided
          vatNumber,
          legalForm,
          address,
          city,
          postalCode,
          phone,
          email,
          type: 'client',
          status: UserStatus.ACTIVE,
        },
      });

      // Create client user
      const client = await this.prisma.user.create({
        data: {
          username,
          firstName,
          lastName,
          email,
          password: hashedPassword,
          phone,
          companyId: clientCompany.id,
          id_role: clientRole.id,
          status: UserStatus.ACTIVE,
          createdById: accountantId,
        },
        include: {
          role: {
            select: {
              nameFr: true,
              nameEn: true,
              code: true,
            },
          },
          company: true,
        },
      });

      // Update company owner
      await this.prisma.company.update({
        where: { id: clientCompany.id },
        data: { ownerId: client.id },
      });

      // Create relationship between client company and accounting firm
      await this.prisma.clientAccountingFirmRelationship.create({
        data: {
          clientCompanyId: clientCompany.id,
          accountingFirmId: accountant.companyId,
          invitedBy: accountant.id, // Accountant who created the client
          status: UserStatus.ACTIVE,
          relationshipStart: new Date(),
        } as any,
      });

      // Send welcome email with password
      try {
        await this.mailService.sendAccountCreatedWithPasswordEmail(
          email,
          `${firstName} ${lastName}`,
          password,
          companyName,
          'Client'
        );
      } catch (error) {
        console.error('Failed to send welcome email:', error);
      }

      // Return simple response with essential information
      return {
        success: true,
        message: 'Client créé avec succès',
        data: {
          id: client.id,
          fullName: `${client.firstName} ${client.lastName}`,
          email: client.email,
          phone: client.phone,
          company: {
            id: clientCompany.id,
            name: clientCompany.name,
            siret: clientCompany.siret,
            vatNumber: clientCompany.vatNumber,
            legalForm: clientCompany.legalForm,
            address: clientCompany.address,
            city: clientCompany.city,
            postalCode: clientCompany.postalCode,
            phone: clientCompany.phone,
            email: clientCompany.email,
          },
          status: client.status,
          createdAt: client.createdAt,
        },
      };
    } catch (error) {
      console.error('Create client error:', error);
      throw error;
    }
  }

  // Get all collaborators of accountant's firm
  async getCollaborators(accountantId: number, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    try {
      // Get accountant user with company
      const accountant = await this.prisma.user.findUnique({
        where: { id: accountantId },
        include: { role: true },
      });

      if (!accountant || accountant.role?.code !== RoleCode.ACCOUNTANT) {
        throw new ApiError('Accountant not found', 404, 'ACCOUNTANT_NOT_FOUND');
      }

      if (!accountant.companyId) {
        throw new ApiError('Accountant must be associated with a company', 400, 'NO_COMPANY');
      }

      // Find COLLABORATOR role
      const collaboratorRole = await this.prisma.role.findUnique({
        where: { code: RoleCode.COLLABORATOR },
      });

      if (!collaboratorRole) {
        throw new ApiError('Collaborator role not found', 500, 'ROLE_NOT_FOUND');
      }

      const [total, data] = await Promise.all([
        this.prisma.user.count({
          where: {
            companyId: accountant.companyId,
            id_role: collaboratorRole.id,
          },
        }),
        this.prisma.user.findMany({
          where: {
            companyId: accountant.companyId,
            id_role: collaboratorRole.id,
          },
          skip,
          take: limit,
          include: {
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
    } catch (error) {
      console.error('Get collaborators error:', error);
      throw error;
    }
  }

  // Get all clients of accountant's firm
  async getClients(accountantId: number, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    try {
      // Get accountant user with company
      const accountant = await this.prisma.user.findUnique({
        where: { id: accountantId },
        include: { role: true },
      });

      if (!accountant || accountant.role?.code !== RoleCode.ACCOUNTANT) {
        throw new ApiError('Accountant not found', 404, 'ACCOUNTANT_NOT_FOUND');
      }

      if (!accountant.companyId) {
        throw new ApiError('Accountant must be associated with a company', 400, 'NO_COMPANY');
      }

      // Get all client companies related to this accounting firm
      const relationships = await this.prisma.clientAccountingFirmRelationship.findMany({
        where: {
          accountingFirmId: accountant.companyId,
        },
        include: {
          clientCompany: {
            include: {
              employees: {
                include: {
                  role: {
                    select: {
                      nameFr: true,
                      nameEn: true,
                      code: true,
                    },
                  },
                },
                where: {
                  role: {
                    code: RoleCode.CLIENT,
                  },
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      });

      const total = await this.prisma.clientAccountingFirmRelationship.count({
        where: {
          accountingFirmId: accountant.companyId,
        },
      });

      // Transform data to simple format
      const clients = relationships.map((rel) => {
        const company = rel.clientCompany;
        const primaryUser = company.employees[0]; // Get first employee (owner)

        return {
          id: company.id,
          fullName: primaryUser ? `${primaryUser.firstName} ${primaryUser.lastName}` : 'N/A',
          email: primaryUser?.email || company.email,
          phone: primaryUser?.phone || company.phone,
          company: {
            name: company.name,
            siret: company.siret,
            vatNumber: company.vatNumber,
            legalForm: company.legalForm,
            address: company.address,
            city: company.city,
            postalCode: company.postalCode,
          },
          status: company.status,
          relationshipStatus: rel.status,
          relationshipStart: rel.relationshipStart,
          createdAt: company.createdAt,
        };
      });

      return {
        data: clients,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Get clients error:', error);
      throw error;
    }
  }

  // PUBLIC: Browse all accountant profiles (for visitors)
  async browseAccountants(filters: {
    page?: number;
    limit?: number;
    location?: string;
    specialty?: string;
    search?: string;
    reviewMin?: number;
    reviewMax?: number;
  }) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 50); // Max 50 per page
    const skip = (page - 1) * limit;

    try {
      // Find ACCOUNTANT role
      const accountantRole = await this.prisma.role.findUnique({
        where: { code: RoleCode.ACCOUNTANT },
      });

      if (!accountantRole) {
        throw new ApiError('Accountant role not found', 500, 'ROLE_NOT_FOUND');
      }

      // Build company filter
      const companyFilter: any = {};

      // Filter by review rating range
      if (filters.reviewMin !== undefined || filters.reviewMax !== undefined) {
        const ratingCondition: any = {};
        if (filters.reviewMin !== undefined) {
          ratingCondition.gte = filters.reviewMin;
        }
        if (filters.reviewMax !== undefined) {
          ratingCondition.lte = filters.reviewMax;
        }
        companyFilter.rating = ratingCondition;
      }

      // Build where clause
      const where: any = {
        id_role: accountantRole.id,
        status: UserStatus.ACTIVE,
        companyId: { not: null }, // Must have a company
      };

      // Add company filters if any (except location which needs OR)
      if (Object.keys(companyFilter).length > 0) {
        where.company = {
          is: companyFilter,
        };
      }

      // Filter by location (search in city, address, or postalCode)
      if (filters.location) {
        const locationConditions = [
          {
            company: {
              is: {
                city: {
                  contains: filters.location,
                  mode: 'insensitive',
                },
              },
            },
          },
          {
            company: {
              is: {
                address: {
                  contains: filters.location,
                  mode: 'insensitive',
                },
              },
            },
          },
          {
            company: {
              is: {
                postalCode: {
                  contains: filters.location,
                  mode: 'insensitive',
                },
              },
            },
          },
        ];

        // Combine with existing where conditions
        if (where.OR) {
          where.AND = [{ OR: where.OR }, { OR: locationConditions }];
          delete where.OR;
        } else {
          where.OR = locationConditions;
        }
      }

      // Search by firstName, lastName, or company name
      if (filters.search) {
        where.OR = [
          {
            firstName: {
              contains: filters.search,
              mode: 'insensitive',
            },
          },
          {
            lastName: {
              contains: filters.search,
              mode: 'insensitive',
            },
          },
          {
            company: {
              is: {
                name: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
            },
          },
        ];
      }

      const [total, data] = await Promise.all([
        this.prisma.user.count({ where }),
        this.prisma.user.findMany({
          where,
          skip,
          take: limit,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            photo: true,
            coverPhoto: true,
            position: true,
            department: true,
            cin: true,
            diploma: true,
            company: {
              select: {
                id: true,
                name: true,
                description: true,
                experience: true,
                city: true,
                address: true,
                postalCode: true,
                phone: true,
                email: true,
                siret: true,
                vatNumber: true,
                legalForm: true,
                specialties: true,
                rating: true,
                numberOfReviews: true,
                logo: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
      ]);

      // Filter out incomplete profiles (must have required company fields)
      const completeProfiles = data.filter((accountant) => {
        if (!accountant.company) return false;

        // Check required fields
        const hasName = accountant.company.name && accountant.company.name.trim() !== '';
        const hasDescription =
          accountant.company.description && accountant.company.description.trim() !== '';
        const hasExperience =
          accountant.company.experience && accountant.company.experience.trim() !== '';
        const hasAddress = accountant.company.address && accountant.company.address.trim() !== '';
        const hasSpecialties =
          accountant.company.specialties && accountant.company.specialties.length > 0;

        if (!hasName || !hasDescription || !hasExperience || !hasAddress || !hasSpecialties) {
          return false;
        }

        // Filter by specialty (partial match, case insensitive)
        if (filters.specialty) {
          const specialtyLower = filters.specialty.toLowerCase();
          const hasMatchingSpecialty = accountant.company.specialties.some((s) =>
            s.toLowerCase().includes(specialtyLower)
          );
          if (!hasMatchingSpecialty) return false;
        }

        return true;
      });

      // Generate presigned URLs for all accountants with complete profiles
      const accountantsWithUrls = await Promise.all(
        completeProfiles.map(async (accountant) => {
          let photoUrl: string | null = null;
          if (accountant.photo) {
            try {
              photoUrl = await this.minioService.getPresignedUrl(
                accountant.photo,
                7 * 24 * 60 * 60
              );
            } catch (error) {
              console.error('Error generating presigned URL for photo:', error);
              photoUrl = accountant.photo;
            }
          }

          let coverPhotoUrl: string | null = null;
          if (accountant.coverPhoto) {
            try {
              coverPhotoUrl = await this.minioService.getPresignedUrl(
                accountant.coverPhoto,
                7 * 24 * 60 * 60
              );
            } catch (error) {
              console.error('Error generating presigned URL for cover photo:', error);
              coverPhotoUrl = accountant.coverPhoto;
            }
          }

          let logoUrl: string | null = null;
          if (accountant.company?.logo) {
            try {
              logoUrl = await this.minioService.getPresignedUrl(
                accountant.company.logo,
                7 * 24 * 60 * 60
              );
            } catch (error) {
              console.error('Error generating presigned URL for logo:', error);
              logoUrl = accountant.company.logo;
            }
          }

          return {
            id: accountant.id,
            name: `${accountant.firstName} ${accountant.lastName}`,
            firstName: accountant.firstName,
            lastName: accountant.lastName,
            email: accountant.email,
            phone: accountant.phone,
            photoUrl,
            coverPhotoUrl,
            specialty: accountant.position,
            department: accountant.department,
            cin: accountant.cin,
            diploma: accountant.diploma,
            company: accountant.company
              ? {
                  id: accountant.company.id,
                  name: accountant.company.name,
                  description: accountant.company.description,
                  experience: accountant.company.experience,
                  city: accountant.company.city,
                  address: accountant.company.address,
                  postalCode: accountant.company.postalCode,
                  phone: accountant.company.phone,
                  email: accountant.company.email,
                  siret: accountant.company.siret,
                  vatNumber: accountant.company.vatNumber,
                  legalForm: accountant.company.legalForm,
                  logoUrl,
                  specialties: accountant.company.specialties || [],
                  rating: accountant.company.rating || 0,
                  numberOfReviews: accountant.company.numberOfReviews || 0,
                }
              : null,
          };
        })
      );

      return {
        data: accountantsWithUrls,
        pagination: {
          total: accountantsWithUrls.length, // Use filtered count
          page,
          limit,
          totalPages: Math.ceil(accountantsWithUrls.length / limit),
        },
        filters: {
          location: filters.location || null,
          specialty: filters.specialty || null,
          search: filters.search || null,
          reviewMin: filters.reviewMin !== undefined ? filters.reviewMin : null,
          reviewMax: filters.reviewMax !== undefined ? filters.reviewMax : null,
        },
      };
    } catch (error) {
      console.error('Browse accountants error:', error);
      throw error;
    }
  }

  // PUBLIC: Get accountant profile details by ID
  async getAccountantProfile(accountantId: number) {
    try {
      // Find ACCOUNTANT role
      const accountantRole = await this.prisma.role.findUnique({
        where: { code: RoleCode.ACCOUNTANT },
      });

      if (!accountantRole) {
        throw new ApiError('Accountant role not found', 500, 'ROLE_NOT_FOUND');
      }

      const accountant = await this.prisma.user.findFirst({
        where: {
          id: accountantId,
          id_role: accountantRole.id,
          status: UserStatus.ACTIVE,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          photo: true,
          coverPhoto: true,
          position: true,
          department: true,
          diploma: true,
          company: {
            select: {
              id: true,
              name: true,
              description: true,
              experience: true,
              employeeCount: true,
              sector: true,
              city: true,
              address: true,
              postalCode: true,
              phone: true,
              numWhatsapp: true,
              email: true,
              website: true,
              siret: true,
              vatNumber: true,
              legalForm: true,
              patentNumber: true,
              patentFile: true,
              rne: true,
              rneFile: true,
              logo: true,
              specialties: true,
              rating: true,
              numberOfReviews: true,
            },
          },
        },
      });

      if (!accountant) {
        throw new ApiError('Accountant profile not found', 404, 'PROFILE_NOT_FOUND');
      }

      // Generate presigned URLs for photo and coverPhoto if they exist
      let photoUrl: string | null = null;
      if (accountant.photo) {
        try {
          photoUrl = await this.minioService.getPresignedUrl(accountant.photo, 7 * 24 * 60 * 60); // 7 days
        } catch (error) {
          console.error('Error generating presigned URL for photo:', error);
          photoUrl = accountant.photo; // Fallback to path
        }
      }

      let coverPhotoUrl: string | null = null;
      if (accountant.coverPhoto) {
        try {
          coverPhotoUrl = await this.minioService.getPresignedUrl(
            accountant.coverPhoto,
            7 * 24 * 60 * 60
          ); // 7 days
        } catch (error) {
          console.error('Error generating presigned URL for cover photo:', error);
          coverPhotoUrl = accountant.coverPhoto; // Fallback to path
        }
      }

      // Generate presigned URL for company logo if exists
      let logoUrl: string | null = null;
      if (accountant.company?.logo) {
        try {
          logoUrl = await this.minioService.getPresignedUrl(
            accountant.company.logo,
            7 * 24 * 60 * 60
          ); // 7 days
        } catch (error) {
          console.error('Error generating presigned URL for logo:', error);
          logoUrl = accountant.company.logo; // Fallback to path
        }
      }

      // Generate presigned URL for patent file if exists
      let patentFileUrl: string | null = null;
      if (accountant.company?.patentFile) {
        try {
          patentFileUrl = await this.minioService.getPresignedUrl(
            accountant.company.patentFile,
            7 * 24 * 60 * 60
          );
        } catch (error) {
          console.error('Error generating presigned URL for patent file:', error);
          patentFileUrl = accountant.company.patentFile;
        }
      }

      // Generate presigned URL for RNE file if exists
      let rneFileUrl: string | null = null;
      const rneFilePath =
        accountant.company?.rneFile ||
        (accountant.company?.rne?.includes('/') ? accountant.company.rne : null);

      if (rneFilePath) {
        try {
          rneFileUrl = await this.minioService.getPresignedUrl(rneFilePath, 7 * 24 * 60 * 60);
        } catch (error) {
          console.error('Error generating presigned URL for RNE file:', error);
          rneFileUrl = rneFilePath;
        }
      }

      return {
        id: accountant.id,
        name: `${accountant.firstName} ${accountant.lastName}`,
        firstName: accountant.firstName,
        lastName: accountant.lastName,
        email: accountant.email,
        phone: accountant.phone,
        photoUrl: photoUrl, // URL présignée MinIO
        coverPhotoUrl: coverPhotoUrl, // URL présignée MinIO
        specialty: accountant.position,
        department: accountant.department,
        diploma: accountant.diploma,
        company: accountant.company
          ? {
              id: accountant.company.id,
              name: accountant.company.name,
              description: accountant.company.description,
              experience: accountant.company.experience,
              employeeCount: accountant.company.employeeCount
                ? String(accountant.company.employeeCount)
                : null,
              sector: accountant.company.sector,
              city: accountant.company.city,
              address: accountant.company.address,
              postalCode: accountant.company.postalCode,
              phone: accountant.company.phone,
              numWhatsapp: accountant.company.numWhatsapp,
              email: accountant.company.email,
              website: accountant.company.website,
              siret: accountant.company.siret,
              vatNumber: accountant.company.vatNumber,
              legalForm: accountant.company.legalForm,
              patentNumber: accountant.company.patentNumber,
              patentFileUrl: patentFileUrl,
              rne: accountant.company.rne?.includes('/') ? null : accountant.company.rne, // Only return if it's a number, not a path
              rneFileUrl: rneFileUrl,
              logoUrl: logoUrl,
              specialties: accountant.company.specialties || [],
              rating: accountant.company.rating || 0,
              numberOfReviews: accountant.company.numberOfReviews || 0,
            }
          : null,
      };
    } catch (error) {
      console.error('Get accountant profile error:', error);
      throw error;
    }
  }

  // ACCOUNTANT: Update own public profile
  async updateMyProfile(
    accountantId: number,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      position?: string;
      department?: string;
      phone?: string;
      cin?: string;
      diploma?: string;
      experience?: string;
      description?: string;
      specialties?: string[];
    },
    photoFile?: Express.Multer.File,
    coverPhotoFile?: Express.Multer.File
  ) {
    console.log('updateMyProfile called');
    console.log('Photo file:', photoFile ? photoFile.originalname : 'No photo');
    console.log(
      'Cover photo file:',
      coverPhotoFile ? coverPhotoFile.originalname : 'No cover photo'
    );

    try {
      // Verify user is accountant
      const accountant = await this.prisma.user.findUnique({
        where: { id: accountantId },
        include: { role: true },
      });

      if (!accountant || accountant.role?.code !== RoleCode.ACCOUNTANT) {
        throw new ApiError('Only accountants can update their profile', 403, 'FORBIDDEN');
      }

      // Check email uniqueness if email is being updated
      if (data.email && data.email !== accountant.email) {
        const emailExists = await this.prisma.user.findUnique({
          where: { email: data.email },
        });

        if (emailExists) {
          throw new ApiError('Email already exists', 400, 'EMAIL_EXISTS');
        }
      }

      // Handle photo upload to MinIO
      let photoPath: string | undefined;
      if (photoFile && accountant.companyId) {
        try {
          // Delete old photo from MinIO if exists
          if (accountant.photo) {
            try {
              await this.minioService.deleteFile(accountant.photo);
            } catch (deleteError) {
              console.log('Could not delete old photo:', deleteError);
            }
          }

          // Upload new photo to MinIO
          photoPath = await this.minioService.uploadFile(
            accountant.companyId,
            'users/photos',
            photoFile
          );
          console.log('Photo uploaded successfully to MinIO:', photoPath);
        } catch (photoError) {
          console.error('Photo upload error:', photoError);
          photoPath = undefined;
        }
      }

      // Handle cover photo upload to MinIO
      let coverPhotoPath: string | undefined;
      if (coverPhotoFile && accountant.companyId) {
        try {
          // Delete old cover photo from MinIO if exists
          if (accountant.coverPhoto) {
            try {
              await this.minioService.deleteFile(accountant.coverPhoto);
            } catch (deleteError) {
              console.log('Could not delete old cover photo:', deleteError);
            }
          }

          // Upload new cover photo to MinIO
          coverPhotoPath = await this.minioService.uploadFile(
            accountant.companyId,
            'users/cover-photos',
            coverPhotoFile
          );
          console.log('Cover photo uploaded successfully to MinIO:', coverPhotoPath);
        } catch (coverPhotoError) {
          console.error('Cover photo upload error:', coverPhotoError);
          coverPhotoPath = undefined;
        }
      }

      // Update company if experience, description, or specialties provided
      if (
        accountant.companyId &&
        (data.experience !== undefined ||
          data.description !== undefined ||
          data.specialties !== undefined)
      ) {
        const companyUpdateData: any = {};

        if (data.experience !== undefined && data.experience !== null) {
          // Keep experience as string (can be text like "5 ans" or "Expert depuis 2010")
          const experienceStr = String(data.experience).trim();
          if (experienceStr !== '' && experienceStr !== 'null' && experienceStr !== 'undefined') {
            companyUpdateData.experience = experienceStr;
            console.log('Experience saved as string:', experienceStr);
          } else {
            console.log('Experience is empty or null string');
          }
        }

        if (data.description !== undefined) {
          companyUpdateData.description = data.description;
        }

        if (data.specialties !== undefined) {
          // Transform specialties if it's a string (from form-data)
          let specialtiesArray: string[] = [];
          if (typeof data.specialties === 'string') {
            specialtiesArray = (data.specialties as string).split(',').map((s) => s.trim());
          } else if (Array.isArray(data.specialties)) {
            specialtiesArray = data.specialties;
          }
          companyUpdateData.specialties = specialtiesArray;
        }

        await this.prisma.company.update({
          where: { id: accountant.companyId },
          data: companyUpdateData,
        });
      }

      const updated = await this.prisma.user.update({
        where: { id: accountantId },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          position: data.position,
          department: data.department,
          phone: data.phone,
          cin: data.cin,
          diploma: data.diploma,
          ...(photoPath && { photo: photoPath }),
          ...(coverPhotoPath && { coverPhoto: coverPhotoPath }),
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          photo: true,
          coverPhoto: true,
          position: true,
          department: true,
          cin: true,
          diploma: true,
          company: {
            select: {
              id: true,
              name: true,
              city: true,
              address: true,
              postalCode: true,
              phone: true,
              email: true,
              experience: true,
              description: true,
            },
          },
        },
      });

      // Generate presigned URLs for photos if they exist
      let photoUrl: string | null = null;
      if (updated.photo) {
        try {
          photoUrl = await this.minioService.getPresignedUrl(updated.photo, 7 * 24 * 60 * 60);
        } catch (error) {
          console.error('Error generating presigned URL for photo:', error);
          photoUrl = updated.photo;
        }
      }

      let coverPhotoUrl: string | null = null;
      if (updated.coverPhoto) {
        try {
          coverPhotoUrl = await this.minioService.getPresignedUrl(
            updated.coverPhoto,
            7 * 24 * 60 * 60
          );
        } catch (error) {
          console.error('Error generating presigned URL for cover photo:', error);
          coverPhotoUrl = updated.coverPhoto;
        }
      }

      return {
        success: true,
        message: 'Profile updated successfully',
        data: {
          id: updated.id,
          firstName: updated.firstName,
          lastName: updated.lastName,
          email: updated.email,
          phone: updated.phone,
          photoUrl,
          coverPhotoUrl,
          position: updated.position,
          department: updated.department,
          cin: updated.cin,
          diploma: updated.diploma,
          company: updated.company,
        },
      };
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }
}
