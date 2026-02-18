import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { stringify } from 'csv-stringify/sync';
import { Prisma } from '@prisma/client';
import { ApiError } from 'src/common/errors/api-error';
import { errors } from 'src/common/errors/errors';
import {
  CompareProfilesDto,
  ComparisonStatus,
} from './dto/compare-profiles.dto';
import axios from 'axios';
import { PreComparaisonDto } from './dto/pre-comparaison.dto';
import { TaskMatchDto } from './dto/profile-comparison-response.dto';
@Injectable()
export class ProfileComparisonsService {
  private readonly comparisonApiUrl = process.env.BACK_URL_COMPARAISON;
  private readonly apiKey = process.env.API_KEY;
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 🔹 Get all profile comparisons (paginated)
   */
  async findAll(
    page = 1,
    limit = 5,
    search?: string,
    dateFrom?: string,
    dateTo?: string,
  ) {
    const pageNum = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 5));

    const where: Prisma.ProfileComparisonWhereInput = {};

    // 🔎 Recherche texte
    if (search?.trim()) {
      where.OR = [
        { ProgrammeToCompare: { contains: search, mode: 'insensitive' } },
        { ProgrammeToCompare_en: { contains: search, mode: 'insensitive' } },
        { ProgrammeComparedTo: { contains: search, mode: 'insensitive' } },
        { ProgrammeComparedTo_en: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 📅 Intervalle de dates INCLUSIF
    if (dateFrom || dateTo) {
      where.createdAt = {};

      if (dateFrom) {
        where.createdAt.gte = new Date(`${dateFrom}T00:00:00.000Z`);
      }

      if (dateTo) {
        where.createdAt.lte = new Date(`${dateTo}T23:59:59.999Z`);
      }
    }

    const [totalCount, items] = await this.prisma.$transaction([
      this.prisma.profileComparison.count({ where }),
      this.prisma.profileComparison.findMany({
        where,
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return {
      status: 'success',
      code: 200,
      data: items,
      pagination: {
        currentPage: pageNum,
        totalPages,
        limitPerPage: pageSize,
        totalCount,
      },
    };
  }
  async getProfileComparisonById(id: number) {
    const comparison = await this.prisma.profileComparison.findUnique({
      where: { id },
      include: {
        task_similarities: true,
      },
    });

    if (!comparison) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode,
      );
    }

    /* 🔁 Grouper les task_similarities par task */
    const groupedTasks = new Map<string, TaskMatchDto>();

    for (const row of comparison.task_similarities) {
      if (!groupedTasks.has(row.task_name)) {
        groupedTasks.set(row.task_name, {
          task: row.task_name,
          task_en: row.task_name_en ?? '',
          matches: [],
        });
      }

      groupedTasks.get(row.task_name)!.matches.push({
        module: row.module_name,
        module_en: row.module_name_en ?? '',
        similarity_score: Number(row.similarity_score),
        is_similar: row.is_similar,
      });
    }

    /* 📊 Calcul moyenne */
    const avgScore =
      comparison.task_similarities.reduce(
        (sum, t) => sum + Number(t.similarity_score),
        0,
      ) / comparison.task_similarities.length;

    return {
      status: 'success',
      code: 200,
      data: {
        ProgrammeToCompare: comparison.ProgrammeToCompare ?? '',
        ProgrammeToCompare_en: comparison.ProgrammeToCompare_en ?? '',
        ProgrammeComparedTo: comparison.ProgrammeComparedTo ?? '',
        ProgrammeComparedTo_en: comparison.ProgrammeComparedTo_en ?? '',
        comparison_type: 'tasks_to_modules',
        direction: 'DIRECT',
        average_similarity_score: Number(avgScore.toFixed(2)),
        matches: Array.from(groupedTasks.values()),
        message: 'Comparison loaded from database',
      },
    };
  }

  async preComparaison(dto: PreComparaisonDto) {
    if (!this.comparisonApiUrl || !this.apiKey) {
      throw new ApiError(
        errors.PRE_COMPARAISON_NOT_CONFIGURED.message,
        errors.PRE_COMPARAISON_NOT_CONFIGURED.code,
        errors.PRE_COMPARAISON_NOT_CONFIGURED.errorCode,
      );
    }

    try {
      const url = `${this.comparisonApiUrl}pre-comparaison-profile`;

      const response = await axios.post(url, dto, {
        headers: {
          API_KEY: this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      return {
        status: 'success',
        code: 200,
        data: response.data,
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error(
          'Python pre-comparaison API error:',
          error.response?.data,
        );

        throw new ApiError(
          errors.PRE_COMPARAISON_FAILED.message,
          errors.PRE_COMPARAISON_FAILED.code,
          errors.PRE_COMPARAISON_FAILED.errorCode,
        );
      }
      throw new ApiError(
        errors.PRE_COMPARAISON_FAILED.message,
        errors.PRE_COMPARAISON_FAILED.code,
        errors.PRE_COMPARAISON_FAILED.errorCode,
      );
    }
  }

  async compareProfiles(dto: CompareProfilesDto) {
    const { profile_program_id, compared_program_id, status } = dto;

    if (!this.comparisonApiUrl) {
      throw new ApiError(
        errors.COMPARISON_SERVICE_NOT_CONFIGURED.message,
        errors.COMPARISON_SERVICE_NOT_CONFIGURED.code,
        errors.COMPARISON_SERVICE_NOT_CONFIGURED.errorCode,
      );
    }

    try {
      const direction =
        status === ComparisonStatus.DIRECT ? 'DIRECT' : 'INDIRECT';

      const queryParams =
        status === ComparisonStatus.DIRECT
          ? `profile_program_id=${profile_program_id}&compared_program_id=${compared_program_id}`
          : `compared_program_id=${profile_program_id}&profile_program_id=${compared_program_id}`;

      const url = `${this.comparisonApiUrl}compare-profiles?${queryParams}&direction=${direction}`;

      const response = await axios.post(url);

      return {
        status: 'success',
        code: 200,
        data: response.data,
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error('Python comparison API error:', error.response?.data);

        throw new ApiError(
          errors.PROFILE_COMPARISON_FAILED.message,
          errors.PROFILE_COMPARISON_FAILED.code,
          errors.PROFILE_COMPARISON_FAILED.errorCode,
        );
      }

      throw new ApiError(
        errors.PROFILE_COMPARISON_FAILED.message,
        errors.PROFILE_COMPARISON_FAILED.code,
        errors.PROFILE_COMPARISON_FAILED.errorCode,
      );
    }
  }
  async exportAllCsv(lang = 'fr'): Promise<Buffer> {
    const langLower = lang.toLowerCase();

    const rows = await this.prisma.profileComparison.findMany({
      select: {
        id: true,
        ProgrammeComparedTo: true,
        ProgrammeComparedTo_en: true,
        ProgrammeToCompare: true,
        ProgrammeToCompare_en: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = rows.map((item) => ({
      Reference: item.id,
      Comparable:
        langLower === 'en'
          ? (item.ProgrammeComparedTo_en ?? item.ProgrammeComparedTo)
          : item.ProgrammeComparedTo,
      [langLower === 'en' ? 'Compared' : 'Comparé']:
        langLower === 'en'
          ? (item.ProgrammeToCompare_en ?? item.ProgrammeToCompare)
          : item.ProgrammeToCompare,
      [langLower === 'en' ? 'Comparison Date' : 'Date de comparaison']:
        item.createdAt?.toISOString(),
    }));

    const csv = stringify(data, {
      header: true,
      delimiter: ';', // Excel FR friendly
    });

    // ✨ Add UTF-8 BOM for Excel to properly read accents
    const bom = Buffer.from('\uFEFF', 'utf-8');
    return Buffer.concat([bom, Buffer.from(csv, 'utf-8')]);
  }

  /**
   * 🔹 Delete profile comparison + task_similarities
   */
  async remove(id: number) {
    await this.prisma.task_similarities.deleteMany({
      where: { id_profilecomparison: id },
    });

    const deleted = await this.prisma.profileComparison.deleteMany({
      where: { id },
    });

    if (deleted.count === 0) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode,
      );
    }

    return {
      status: 'success',
      code: 200,
      message: 'ProfileComparison deleted successfully',
    };
  }
}
