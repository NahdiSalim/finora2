import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { ApiError } from 'src/common/errors/api-error';
import * as bcrypt from 'bcrypt';
import { MailService } from '../mail/mail.service';
import { CreateCollaboratorDto } from './dto/create-collaborator.dto';
import { CreateClientDto } from './dto/create-client.dto';
import { RoleCode } from 'src/common/enums/role.enum';
import { UserStatus } from 'src/common/enums/user-status.enum';

@Injectable()
export class AccountantService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService
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
      const relationship = await this.prisma.clientAccountingFirmRelationship.create({
        data: {
          clientCompanyId: clientCompany.id,
          accountingFirmId: accountant.companyId,
          status: UserStatus.ACTIVE,
          relationshipStart: new Date(),
        },
        include: {
          clientCompany: {
            select: {
              id: true,
              name: true,
            },
          },
          accountingFirm: {
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
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
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

      // Build where clause
      const where: any = {
        id_role: accountantRole.id,
        status: UserStatus.ACTIVE,
      };

      // Filter by location (city)
      if (filters.location) {
        where.company = {
          city: {
            contains: filters.location,
            mode: 'insensitive',
          },
        };
      }

      // Search by name, company name, or position
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
              name: {
                contains: filters.search,
                mode: 'insensitive',
              },
            },
          },
          {
            position: {
              contains: filters.search,
              mode: 'insensitive',
            },
          },
        ];
      }

      // Filter by specialty (position field)
      if (filters.specialty) {
        where.position = {
          contains: filters.specialty,
          mode: 'insensitive',
        };
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
            position: true,
            department: true,
            company: {
              select: {
                id: true,
                name: true,
                city: true,
                address: true,
                postalCode: true,
                phone: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
      ]);

      return {
        data: data.map((accountant) => ({
          id: accountant.id,
          name: `${accountant.firstName} ${accountant.lastName}`,
          firstName: accountant.firstName,
          lastName: accountant.lastName,
          email: accountant.email,
          phone: accountant.phone,
          photo: accountant.photo,
          specialty: accountant.position,
          department: accountant.department,
          company: accountant.company,
        })),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
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
          position: true,
          department: true,
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
              siret: true,
              vatNumber: true,
              legalForm: true,
            },
          },
        },
      });

      if (!accountant) {
        throw new ApiError('Accountant profile not found', 404, 'PROFILE_NOT_FOUND');
      }

      return {
        id: accountant.id,
        name: `${accountant.firstName} ${accountant.lastName}`,
        firstName: accountant.firstName,
        lastName: accountant.lastName,
        email: accountant.email,
        phone: accountant.phone,
        photo: accountant.photo,
        specialty: accountant.position,
        department: accountant.department,
        diploma: accountant.diploma,
        company: accountant.company,
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
      position?: string;
      department?: string;
      phone?: string;
      diploma?: string;
    }
  ) {
    try {
      // Verify user is accountant
      const accountant = await this.prisma.user.findUnique({
        where: { id: accountantId },
        include: { role: true },
      });

      if (!accountant || accountant.role?.code !== RoleCode.ACCOUNTANT) {
        throw new ApiError('Only accountants can update their profile', 403, 'FORBIDDEN');
      }

      const updated = await this.prisma.user.update({
        where: { id: accountantId },
        data: {
          position: data.position,
          department: data.department,
          phone: data.phone,
          diploma: data.diploma,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          photo: true,
          position: true,
          department: true,
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
            },
          },
        },
      });

      return {
        success: true,
        message: 'Profile updated successfully',
        data: updated,
      };
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }
}
