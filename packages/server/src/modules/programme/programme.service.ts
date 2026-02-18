import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ApiError } from '../../common/errors/api-error';
import { errors } from '../../common/errors/errors';
import * as fs from 'fs';
import * as path from 'path';
import { UpdateProgrammeDto } from './dto/update-programme.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { stringify } from 'csv-stringify/sync';

@Injectable()
export class ProgrammeService {
  constructor(private prisma: PrismaService) {}

  async getAllProgrammes(
    page?: number,
    limit?: number,
    search?: string,
    auteur?: string,
    type?: 'Pr' | 'eur',
  ) {
    const pageNum = page || 1;
    const limitNum = limit || 5;
    const skip = (pageNum - 1) * limitNum;

    // Special behavior for German programmes: mix DE/FR programmes and Europass profiles
    // Special behavior for German programmes
    if (auteur === 'DE') {
      const searchTerm = search?.trim() || undefined;

      /* ---------------- PROGRAMMES ---------------- */

      const programmeWhere: Prisma.ProgrammeWhereInput | undefined =
        type !== 'eur'
          ? {
              auteur: { in: ['DE', 'FR'] },
              ...(searchTerm && {
                OR: [
                  {
                    nomProgramme: {
                      contains: searchTerm,
                      mode: 'insensitive',
                    },
                  },
                  {
                    nomProgrammeEn: {
                      contains: searchTerm,
                      mode: 'insensitive',
                    },
                  },
                ],
              }),
            }
          : undefined;

      /* ---------------- PROFILES ---------------- */

      const profileWhere: Prisma.ProfileWhereInput | undefined =
        type !== 'Pr'
          ? searchTerm
            ? {
                OR: [
                  {
                    profile_name: {
                      contains: searchTerm,
                      mode: 'insensitive',
                    },
                  },
                  {
                    profile_name_en: {
                      contains: searchTerm,
                      mode: 'insensitive',
                    },
                  },
                ],
              }
            : {}
          : undefined;

      /* ---------------- COUNTS ---------------- */

      const [totalProgrammes, totalProfiles] = await Promise.all([
        programmeWhere
          ? this.prisma.programme.count({ where: programmeWhere })
          : Promise.resolve(0),
        profileWhere
          ? this.prisma.profile.count({ where: profileWhere })
          : Promise.resolve(0),
      ]);

      const totalCount = totalProgrammes + totalProfiles;

      /* ---------------- PAGINATION LOGIC ---------------- */

      let programmesToFetch = limitNum;
      let profilesToFetch = 0;
      const programmeOffset = skip;
      let profileOffset = 0;

      if (skip >= totalProgrammes) {
        programmesToFetch = 0;
        profilesToFetch = limitNum;
        profileOffset = skip - totalProgrammes;
      } else if (skip + limitNum > totalProgrammes) {
        programmesToFetch = totalProgrammes - skip;
        profilesToFetch = limitNum - programmesToFetch;
      }

      /* ---------------- FETCH DATA ---------------- */

      const [programmes, profiles] = await Promise.all([
        programmeWhere && programmesToFetch > 0
          ? this.prisma.programme.findMany({
              where: programmeWhere,
              skip: programmeOffset,
              take: programmesToFetch,
              orderBy: { id: 'desc' },
              include: {
                _count: { select: { modules: true } },
              },
            })
          : Promise.resolve([]),

        profileWhere && profilesToFetch > 0
          ? this.prisma.profile.findMany({
              where: profileWhere,
              skip: profileOffset,
              take: profilesToFetch,
              orderBy: { id: 'desc' },
            })
          : Promise.resolve([]),
      ]);

      /* ---------------- MAP TO DTO ---------------- */

      const data = [
        ...(type !== 'eur'
          ? programmes.map(({ _count, ...programme }) => ({
              id: programme.id,
              nomProgramme: programme.nomProgramme,
              nomProgrammeEn: programme.nomProgrammeEn,
              secteur: programme.secteur,
              secteurEn: programme.secteurEn,
              sousSecteur: programme.sousSecteur,
              sousSecteurEn: programme.sousSecteurEn,
              auteur: programme.auteur ?? 'DE',
              modulesCount: _count.modules,
              file: programme.file,
              Type: 'Pr' as const,
            }))
          : []),

        ...(type !== 'Pr'
          ? profiles.map((profile) => ({
              id: profile.id,
              nomProgramme: profile.profile_name,
              nomProgrammeEn: profile.profile_name_en ?? profile.profile_name,
              secteur: null,
              secteurEn: null,
              sousSecteur: null,
              sousSecteurEn: null,
              file: profile.file,
              auteur: 'DE',
              Type: 'eur' as const,
            }))
          : []),
      ];

      return {
        status: 'success',
        code: 200,
        data,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalCount / limitNum),
          limitPerPage: limitNum,
          totalCount,
        },
      };
    }

    // Default behaviour for other auteurs (e.g. Tunisien)
    const where: Prisma.ProgrammeWhereInput = {};

    if (auteur) {
      where.auteur = auteur;
    }

    if (search) {
      const orConditions: Prisma.ProgrammeWhereInput[] = [
        {
          nomProgramme: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          nomProgrammeEn: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];

      // For Tunisian programmes, also search by secteur and sousSecteur
      if (auteur === 'Tunisien') {
        orConditions.push(
          {
            secteur: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            sousSecteur: {
              contains: search,
              mode: 'insensitive',
            },
          },
        );
      }

      where.OR = orConditions;
    }

    const [programmes, total] = await Promise.all([
      this.prisma.programme.findMany({
        where,
        orderBy: { id: 'desc' },
        skip,
        take: limitNum,
        include: {
          _count: {
            select: { modules: true },
          },
        },
      }),
      this.prisma.programme.count({ where }),
    ]);

    const data = programmes.map(({ _count, ...programme }) => ({
      ...programme,
      modulesCount: _count.modules,
    }));

    return {
      status: 'success',
      code: '200',
      data,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        limitPerPage: limitNum,
        totalCount: total,
      },
    };
  }
  async updateProgramme(id: number, body: UpdateProgrammeDto) {
    await this.prisma.programme.update({
      where: { id },
      data: {
        ...(body.nomProgramme !== undefined && {
          nomProgramme: body.nomProgramme.trim(),
        }),
        ...(body.nomProgrammeEn !== undefined && {
          nomProgrammeEn: body.nomProgrammeEn.trim(),
        }),
      },
    });

    return { message: 'Programme has been Updated' };
  }
  compareCodeModule(a: string | null, b: string | null): number {
    const re = /^(\d+)(.*)$/;
    if (a && b) {
      const [, aNum = '0', aRest = ''] = a.match(re) || [];
      const [, bNum = '0', bRest = ''] = b.match(re) || [];

      const numDiff = Number(aNum) - Number(bNum);
      if (numDiff !== 0) return numDiff;

      return aRest.localeCompare(bRest, undefined, { sensitivity: 'base' });
    }
    return 0;
  }

  async updateModuleSousModule(id: number, body: UpdateModuleDto) {
    /* ---------- UPDATE MODULE ---------- */
    await this.prisma.module.update({
      where: { id },
      data: {
        ...(body.nomModule !== undefined && {
          nomModule: body.nomModule.trim(),
        }),
        ...(body.nomModuleEn !== undefined && {
          nomModuleEn: body.nomModuleEn.trim(),
        }),
        ...(body.typeModule !== undefined && {
          typeModule: body.typeModule,
        }),
      },
    });

    /* ---------- UPDATE SOUS-MODULES ---------- */
    if (body.sousModules?.length) {
      for (const sm of body.sousModules) {
        await this.prisma.sousModule.update({
          where: { id: sm.id },
          data: {
            ...(sm.nomSousModule !== undefined && {
              nomSousModule: sm.nomSousModule.trim(),
            }),
            ...(sm.nomSousModuleEn !== undefined && {
              nomSousModuleEn: sm.nomSousModuleEn.trim(),
            }),
          },
        });
      }
    }

    return {
      success: true,
      message: 'Module & SousModules updated successfully',
    };
  }

  async getProgrammeWithModules(programmeId: number) {
    const programme = await this.prisma.programme.findUnique({
      where: { id: programmeId },
      select: {
        id: true,
        nomProgramme: true,
        nomProgrammeEn: true,
        secteur: true,
        secteurEn: true,
        sousSecteur: true,
        sousSecteurEn: true,
        auteur: true,

        modules: {
          select: {
            id: true,
            codeModule: true,
            nomModule: true,
            nomModuleEn: true,
            typeModule: true,

            sousModules: {
              select: {
                id: true,
                nomSousModule: true,
                nomSousModuleEn: true,
              },
            },
          },
        },
      },
    });

    if (!programme) {
      throw new NotFoundException('Programme not found');
    }

    // ✅ SORT MODULES BY codeModule (ALPHANUMERIC)
    programme.modules.sort((a, b) =>
      this.compareCodeModule(a.codeModule, b.codeModule),
    );

    return programme;
  }

  async deleteProgramme(id: number) {
    const programme = await this.prisma.programme.findUnique({
      where: { id },
      select: {
        id: true,
        file: true,
      },
    });

    if (!programme) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode,
      );
    }

    const hasComparison = await this.prisma.comparaison.findFirst({
      where: {
        OR: [{ idProgrammeComparedTo: id }, { idProgrammeToCompare: id }],
      },
      select: { id: true },
    });

    const hasProfileComparison = await this.prisma.profileComparison.findFirst({
      where: {
        OR: [{ id_profiletocompare: id }, { id_profilecomparedto: id }],
      },
      select: { id: true },
    });

    if (hasProfileComparison) {
      throw new ApiError(
        errors.ERR_PROGRAM_HAS_PROFILE_COMPARISON.message,
        errors.ERR_PROGRAM_HAS_PROFILE_COMPARISON.code,
        errors.ERR_PROGRAM_HAS_PROFILE_COMPARISON.errorCode,
      );
    }

    if (hasComparison) {
      throw new ApiError(
        errors.ERR_PROGRAM_HAS_COMPARISON.message,
        errors.ERR_PROGRAM_HAS_COMPARISON.code,
        errors.ERR_PROGRAM_HAS_COMPARISON.errorCode,
      );
    }

    function resolveServerRoot(): string {
      let current = __dirname;

      // Remonter jusqu'à trouver le dossier "server"
      while (!current.endsWith(path.sep + 'server')) {
        const parent = path.dirname(current);
        if (parent === current) {
          throw new ApiError(
            errors.ERR_PROGRAM_HAS_SERVER_ROOT_NOT_FOUND.message,
            errors.ERR_PROGRAM_HAS_SERVER_ROOT_NOT_FOUND.code,
            errors.ERR_PROGRAM_HAS_SERVER_ROOT_NOT_FOUND.errorCode,
          );
        }
        current = parent;
      }

      return current;
    }
    if (programme.file) {
      // programme.file = "/uploads/1770299845321.pdf"

      // 1️⃣ nettoyer le chemin DB
      const cleanedPath = programme.file.replace(/^\/+/, '');
      // => "uploads/1770299845321.pdf"

      // 2️⃣ trouver packages/server dynamiquement
      const serverRoot = resolveServerRoot();

      // 3️⃣ chemin absolu final
      const filePath = path.join(serverRoot, cleanedPath);

      console.log('Deleting file:', filePath);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('File deleted successfully');
      } else {
        console.warn('File not found:', filePath);
      }
    }
    /* --------------------------------
     DELETE DB RECORD
  -------------------------------- */
    await this.prisma.programme.delete({
      where: { id },
    });

    return {
      status: 'success',
      code: 204,
      message: 'Programme deleted successfully',
    };
  }

  async exportProgrammes(
    type: 'tn' | 'de',
    lang: 'fr' | 'en' = 'fr',
  ): Promise<Buffer> {
    const useEnglish = lang === 'en';

    const LABELS = {
      fr: {
        PROGRAMME: 'Programme',
        SECTEUR: 'Secteur',
        SOUS_SECTEUR: 'Sous_Secteur',
        NBR_MODULES: 'Nombre de modules',
        TYPE: 'Type',
        TYPE_PROGRAM: "Programme d'étude",
        TYPE_PROFILE: 'Fiche Europass',
      },
      en: {
        PROGRAMME: 'Program',
        SECTEUR: 'Sector',
        SOUS_SECTEUR: 'Sub sector',
        NBR_MODULES: 'Modules count',
        TYPE: 'Type',
        TYPE_PROGRAM: 'Study Programme',
        TYPE_PROFILE: 'Europass Profile',
      },
    } as const;

    const L = LABELS[lang];
    let data: Record<string, string | number>[] = [];

    /* 🇹🇳 PROGRAMMES TUNISIENS */
    if (type === 'tn') {
      const programmes = await this.prisma.programme.findMany({
        where: { auteur: 'Tunisien' },
        select: {
          nomProgramme: true,
          nomProgrammeEn: true,
          secteur: true,
          secteurEn: true,
          sousSecteur: true,
          sousSecteurEn: true,
          _count: { select: { modules: true } },
        },
        orderBy: { id: 'desc' },
      });

      data = programmes.map((p) => ({
        [L.PROGRAMME]:
          (useEnglish ? p.nomProgrammeEn : p.nomProgramme) ??
          p.nomProgramme ??
          '',
        [L.SECTEUR]: (useEnglish ? p.secteurEn : p.secteur) ?? '',
        [L.SOUS_SECTEUR]: (useEnglish ? p.sousSecteurEn : p.sousSecteur) ?? '',
        [L.NBR_MODULES]: p._count.modules ?? 0,
      }));
    } else if (type === 'de') {
      /* 🇩🇪 PROGRAMMES + EUROPASS */
      const programmes = await this.prisma.programme.findMany({
        where: { auteur: { in: ['DE', 'FR'] } },
        select: {
          nomProgramme: true,
          nomProgrammeEn: true,
          _count: { select: { modules: true } },
        },
        orderBy: { id: 'desc' },
      });

      const profiles = await this.prisma.profile.findMany({
        select: {
          profile_name: true,
          profile_name_en: true,
        },
        orderBy: { id: 'desc' },
      });

      const programData = programmes.map((p) => ({
        [L.PROGRAMME]:
          (useEnglish ? p.nomProgrammeEn : p.nomProgramme) ??
          p.nomProgramme ??
          '',
        [L.TYPE]: L.TYPE_PROGRAM,
        [L.NBR_MODULES]: p._count.modules ?? 0,
      }));

      const profileData = profiles.map((p) => ({
        [L.PROGRAMME]:
          (useEnglish ? p.profile_name_en : p.profile_name) ??
          p.profile_name ??
          '',
        [L.TYPE]: L.TYPE_PROFILE,
        [L.NBR_MODULES]: 0,
      }));

      data = [...programData, ...profileData];
    } else {
      /* ❌ TYPE INVALIDE */
      throw new ApiError(
        'Invalid export type. Use type=tn or type=de',
        400,
        'INVALID_EXPORT_TYPE',
      );
    }

    /* 📄 CSV */
    const csv = stringify(data, {
      header: true,
      delimiter: ';',
    });

    const bom = Buffer.from('\uFEFF', 'utf-8');
    return Buffer.concat([bom, Buffer.from(csv, 'utf-8')]);
  }
}
