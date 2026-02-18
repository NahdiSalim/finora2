import { Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { CreateRoleDto } from './reate-role.dto';
import { ApiError } from 'src/common/errors/api-error';
import { errors } from '../../common/errors/errors';
import { stringify } from 'csv-stringify/sync';

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    page = 1,
    limit = 10,
    search?: string,
  ): Promise<{
    status: string;
    code: string;
    data: Role[];
    pagination: {
      currentPage: number;
      totalPages: number;
      limitPerPage: number;
      totalCount: number;
    };
  }> {
    const currentPage = Math.max(1, page);
    const limitPerPage = Math.max(1, limit);
    const totalCount = await this.prisma.role.count();
    const totalPages = Math.ceil(totalCount / limitPerPage);

    const where: Prisma.RoleWhereInput = {};
    if (search) {
      where.OR = [
        { nameFr: { contains: search, mode: 'insensitive' } },
        { nameEn: { contains: search, mode: 'insensitive' } },
        { descriptionFr: { contains: search, mode: 'insensitive' } },
        { descriptionEn: { contains: search, mode: 'insensitive' } },
      ];
    }

    const data = await this.prisma.role.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (currentPage - 1) * limitPerPage,
      take: limitPerPage,
    });

    return {
      status: 'success',
      code: '200',
      data,
      pagination: {
        currentPage,
        totalPages,
        limitPerPage,
        totalCount,
      },
    };
  }

  async getOne(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        p_tasks: {
          include: {
            task: {
              select: {
                id: true,
                slug: true,
                id_page: true,
              },
            },
          },
        },

        p_features: {
          include: {
            feature: {
              select: {
                id: true,
                slug: true,
              },
            },
          },
        },

        p_pages: {
          include: {
            page: {
              select: {
                id: true,
                slug: true,
                PageUrl: true,
              },
            },
          },
        },
      },
    });

    if (!role) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode,
      );
    }

    const transformedRole = {
      id: role.id,
      nameFr: role.nameFr,
      nameEn: role.nameEn,
      descriptionFr: role.descriptionFr,
      descriptionEn: role.descriptionEn,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      Features: role.p_features.map((pf) => pf.feature),
      Pages: role.p_pages.map((pp) => pp.page),
      Tasks: role.p_tasks.map((pt) => pt.task),
    };

    return {
      status: 'success',
      code: '200',
      data: transformedRole,
    };
  }

  async create(createRoleDto: CreateRoleDto) {
    const { Features, Pages, Tasks, ...roleInfos } = createRoleDto;

    const existingRole = await this.prisma.role.findUnique({
      where: {
        nameFr_nameEn: {
          nameFr: roleInfos.nameFr,
          nameEn: roleInfos.nameEn,
        },
      },
    });

    if (existingRole) {
      throw new ApiError(
        errors.ERR_ROLE_EXISTS.message,
        errors.ERR_ROLE_EXISTS.code,
        errors.ERR_ROLE_EXISTS.errorCode,
      );
    }

    const result = await this.prisma.$transaction(async (prisma) => {
      const role = await prisma.role.create({
        data: roleInfos,
      });

      // Create p_features associations
      if (Features && Features.length > 0) {
        await prisma.p_features.createMany({
          data: Features.map((feature_id) => ({
            role_id: role.id,
            feature_id,
          })),
          skipDuplicates: true,
        });
      }

      // Create p_pages associations
      if (Pages && Pages.length > 0) {
        await prisma.p_pages.createMany({
          data: Pages.map((page_id) => ({
            role_id: role.id,
            page_id,
          })),
          skipDuplicates: true,
        });
      }

      // Create p_tasks associations
      if (Tasks && Tasks.length > 0) {
        await prisma.p_tasks.createMany({
          data: Tasks.map((task_id) => ({
            role_id: role.id,
            task_id,
          })),
          skipDuplicates: true,
        });
      }

      return role;
    });

    return {
      status: 'success',
      code: '201',
      data: result,
      message: 'Role and associations added successfully',
    };
  }

  async updateRole(id: number, updateRoleDto: CreateRoleDto) {
    const { Features, Pages, Tasks, ...roleInfos } = updateRoleDto;

    const result = await this.prisma.$transaction(async (prisma) => {
      const role = await prisma.role.update({
        where: { id },
        data: roleInfos,
      });
      const existingRole = await this.prisma.role.findUnique({
        where: { id },
      });

      if (!existingRole) {
        throw new ApiError(
          errors.ROLE_NOT_FOUND.message,
          errors.ROLE_NOT_FOUND.code,
          errors.ROLE_NOT_FOUND.errorCode,
        );
      }

      if (existingRole.id === 1) {
        throw new ApiError(
          errors.ADMIN_ROLE_UPDATE_FORBIDDEN.message,
          errors.ADMIN_ROLE_UPDATE_FORBIDDEN.code,
          errors.ADMIN_ROLE_UPDATE_FORBIDDEN.errorCode,
        );
      }

      await prisma.p_features.deleteMany({ where: { role_id: id } });
      await prisma.p_pages.deleteMany({ where: { role_id: id } });
      await prisma.p_tasks.deleteMany({ where: { role_id: id } });

      if (Features?.length) {
        await prisma.p_features.createMany({
          data: Features.map((feature_id) => ({ role_id: id, feature_id })),
          skipDuplicates: true,
        });
      }

      if (Pages?.length) {
        await prisma.p_pages.createMany({
          data: Pages.map((page_id) => ({ role_id: id, page_id })),
          skipDuplicates: true,
        });
      }

      if (Tasks?.length) {
        await prisma.p_tasks.createMany({
          data: Tasks.map((task_id) => ({ role_id: id, task_id })),
          skipDuplicates: true,
        });
      }

      return role;
    });

    return {
      status: 'success',
      code: 200,
      data: result,
      message: 'Role and associations updated successfully',
    };
  }

  async deleteRole(id: number): Promise<{
    status: string;
    code: string;
    message: string;
  }> {
    // Check if role exists
    const role = await this.prisma.role.findUnique({
      where: { id },
      select: {
        id: true,
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode,
      );
    }

    if (role.id === 1) {
      throw new ApiError(
        errors.FORBIDDEN_DELETE_ADMIN.message,
        errors.FORBIDDEN_DELETE_ADMIN.code,
        errors.FORBIDDEN_DELETE_ADMIN.errorCode,
      );
    }

    if (role._count.users > 0) {
      throw new ApiError(
        errors.USER_CONFLICT.message,
        errors.USER_CONFLICT.code,
        errors.USER_CONFLICT.errorCode,
      );
    }

    await this.prisma.role.delete({ where: { id } });

    return {
      status: 'success',
      code: '200',
      message: `Role with id ${id} deleted successfully`,
    };
  }

  async findAllTasks() {
    const tasks = await this.prisma.tasks.findMany({
      orderBy: { createdAt: 'desc' },
    });

    if (!tasks.length) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode,
      );
    }

    return {
      status: 'success',
      code: '200',
      data: tasks,
    };
  }

  async exportRoles(lang: 'fr' | 'en' = 'fr'): Promise<Buffer> {
    const useEnglish = lang === 'en';

    const LABELS = {
      fr: {
        NAME: 'Nom',
        DESCRIPTION: 'Description',
        CREATED_AT: 'Date de Création',
        UPDATED_AT: 'Date de Modification',
      },
      en: {
        NAME: 'Name',
        DESCRIPTION: 'Description',
        CREATED_AT: 'Created At',
        UPDATED_AT: 'Updated At',
      },
    } as const;

    const L = LABELS[lang];

    const roles = await this.prisma.role.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const data = roles.map((role) => ({
      [L.NAME]: useEnglish ? (role.nameEn ?? role.nameFr) : role.nameFr,
      [L.DESCRIPTION]: useEnglish
        ? (role.descriptionEn ?? role.descriptionFr)
        : role.descriptionFr || '',
      [L.CREATED_AT]: role.createdAt.toISOString().split('T')[0],
      [L.UPDATED_AT]: role.updatedAt.toISOString().split('T')[0],
    }));
    const csv = stringify(data, {
      header: true,
      delimiter: ';',
    });

    const bom = Buffer.from('\uFEFF', 'utf-8');
    return Buffer.concat([bom, Buffer.from(csv, 'utf-8')]);
  }
}
