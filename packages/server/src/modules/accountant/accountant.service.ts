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
          siret,
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
          password, // Send the plain password before hashing
          companyName,
          'Client'
        );
      } catch (error) {
        console.error('Failed to send welcome email:', error);
      }

      return {
        success: true,
        message: 'Client created successfully and relationship established',
        data: {
          client: {
            id: client.id,
            username: client.username,
            firstName: client.firstName,
            lastName: client.lastName,
            email: client.email,
            phone: client.phone,
            status: client.status,
            role: client.role,
            company: client.company,
          },
          relationship: {
            id: relationship.id,
            status: relationship.status,
            relationshipStart: relationship.relationshipStart,
            clientCompany: relationship.clientCompany,
            accountingFirm: relationship.accountingFirm,
          },
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

      return {
        data: relationships,
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
}
