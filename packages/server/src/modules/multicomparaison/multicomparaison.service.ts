import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ApiError } from '../../common/errors/api-error';
import { errors } from '../../common/errors/errors';
import { ComparaisonService } from '../comparaison/comparaison.service';
import { CreateMultiComparaisonDto } from './dto/create-multicomparaison.dto';
import { stringify } from 'csv-stringify/sync';

type MultiComparaisonGapsFilters = {
  programmeIds?: number[];
  commun?: boolean;
};

@Injectable()
export class MultiComparaisonService {
  constructor(
    private prisma: PrismaService,
    private comparaisonService: ComparaisonService,
    private simpleComparaisonService: ComparaisonService,
  ) { }

  async createMultiComparaison(dto: CreateMultiComparaisonDto) {
    const prisma = this.prisma;

    const comparedProgrammes = await prisma.programme.findMany({
      where: { id: { in: dto.idProgrammeComparedTo } },
      select: { id: true },
    });
    if (comparedProgrammes.length !== dto.idProgrammeComparedTo.length) {
      const foundIds = comparedProgrammes.map((p) => p.id);
      const missingIds = dto.idProgrammeComparedTo.filter(
        (id) => !foundIds.includes(id),
      );
      throw new ApiError(
        `Programmes with IDs ${missingIds.join(', ')} not found`,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode,
      );
    }

    // Create MultiComparaison record
    const multiComparaison = await prisma.multiComparaison.create({
      data: {},
    });

    // Create individual comparisons
    for (const idComparedTo of dto.idProgrammeComparedTo) {
      try {
        // Call the existing createComparaison service method
        const comparisonResult =
          await this.comparaisonService.createComparaison(
            dto.idProgrammeToCompare,
            idComparedTo,
            multiComparaison.id,
          );

        type CreateComparaisonPayload = {
          id?: number;
          comparaisonID?: number;
        };
        const payload =
          comparisonResult.data as unknown as CreateComparaisonPayload;
        const comparaisonId = payload.id ?? payload.comparaisonID;

        if (!comparaisonId) {
          throw new Error(
            'Comparison created but no ID returned from Python API',
          );
        }

        await prisma.comparaison.update({
          where: { id: comparaisonId },
          data: {
            idMultiComparaison: multiComparaison.id,
          },
        });
      } catch (error: unknown) {
        throw new ApiError(
          error instanceof Error ? error.message : 'Unknown error occurred',
          errors.BAD_REQUEST.code,
          errors.BAD_REQUEST.errorCode,
        );
      }
    }

    // After all comparisons are created, compute and persist
    // averageSimilarity and totalGaps for the multi-comparaison.
    const comparaisonsForMulti = await prisma.comparaison.findMany({
      where: { idMultiComparaison: multiComparaison.id },
      select: {
        tauxDeSimilarite: true,
        nombreEcart: true,
      },
    });

    const similarityRates = comparaisonsForMulti
      .map((c) =>
        c.tauxDeSimilarite !== null && c.tauxDeSimilarite !== undefined
          ? Number(c.tauxDeSimilarite)
          : null,
      )
      .filter((rate): rate is number => rate !== null && !Number.isNaN(rate));

    const averageSimilarity =
      similarityRates.length > 0
        ? similarityRates.reduce((sum, rate) => sum + rate, 0) /
          similarityRates.length
        : null;

    const totalGaps = comparaisonsForMulti.reduce(
      (sum, c) => sum + (c.nombreEcart ?? 0),
      0,
    );

    await prisma.multiComparaison.update({
      where: { id: multiComparaison.id },
      data: {
        averageSimilarity,
        totalGaps,
      },
    });

    return {
      status: 'success',
      code: '200',
      data: {
        id: multiComparaison.id,
      },
    };
  }

  async getAllMultiComparaisons(
    page?: number,
    limit?: number,
    search?: string,
    startDate?: string,
    endDate?: string,
    margeMin?: number,
    margeMax?: number,
  ) {
    const prisma = this.prisma;
    const pageNum = page || 1;
    const limitNum = limit || 10;
    const skip = (pageNum - 1) * limitNum;

    const searchFilter: Prisma.MultiComparaisonWhereInput | undefined = search
      ? ({
        OR: [
          {
            comparaisons: {
              some: {
                programmeToCompare: {
                  is: {
                    nomProgramme: { contains: search, mode: 'insensitive' },
                  },
                },
              },
            },
          },
          {
            comparaisons: {
              some: {
                programmeComparedTo: {
                  is: {
                    nomProgramme: { contains: search, mode: 'insensitive' },
                  },
                },
              },
            },
          },
        ],
      } as Prisma.MultiComparaisonWhereInput)
      : undefined;

    const dateFilter: Prisma.MultiComparaisonWhereInput = {};
    if (startDate || endDate) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (startDate) createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        createdAt.lte = end;
      }
      dateFilter.createdAt = createdAt;
    }
    const margeFilter: Prisma.MultiComparaisonWhereInput = {};
    if (margeMin != null || margeMax != null) {
      const minRatio = margeMin != null ? margeMin / 100 : undefined;
      const maxRatio = margeMax != null ? margeMax / 100 : undefined;
      margeFilter.averageSimilarity = {
        ...(minRatio != null && { gte: minRatio }),
        ...(maxRatio != null && { lte: maxRatio }),
      };
    }

    const whereFilter: Prisma.MultiComparaisonWhereInput = {
      ...(searchFilter ?? {}),
      ...(Object.keys(dateFilter).length ? dateFilter : {}),
      ...(Object.keys(margeFilter).length ? margeFilter : {}),
    };

    const [data, total] = await Promise.all([
      prisma.multiComparaison.findMany({
        where: whereFilter,
        skip,
        take: limitNum,
        orderBy: { id: 'desc' },
        include: {
          comparaisons: {
            select: {
              id: true,
              idProgrammeToCompare: true,
              idProgrammeComparedTo: true,
              tauxDeSimilarite: true,
              nombreEcart: true,
              createdAt: true,
              createdById: true,
              programmeComparedTo: {
                select: {
                  id: true,
                  nomProgramme: true,
                  nomProgrammeEn: true,
                  secteur: true,
                  secteurEn: true,
                  sousSecteur: true,
                  sousSecteurEn: true,
                },
              },
              programmeToCompare: {
                select: {
                  id: true,
                  nomProgramme: true,
                  nomProgrammeEn: true,
                  secteur: true,
                  secteurEn: true,
                  sousSecteur: true,
                  sousSecteurEn: true,
                },
              },
            },
          },
        },
      }),
      prisma.multiComparaison.count({ where: whereFilter }),
    ]);

    const formatProgramme = (programme?: Record<string, unknown> | null) =>
      programme
        ? {
          id: programme.id ?? null,
          Nom_Programme: programme.nomProgramme ?? null,
          Nom_Programme_en: programme.nomProgrammeEn ?? null,
          Secteur: programme.secteur ?? null,
          Secteur_en: programme.secteurEn ?? null,
          Sous_Secteur: programme.sousSecteur ?? null,
          Sous_Secteur_en: programme.sousSecteurEn ?? null,
        }
        : null;

    const items = data.map((item) => {
      const firstComparaison = item.comparaisons[0];
      const idProgrammeToCompare =
        firstComparaison?.idProgrammeToCompare ?? null;
      const idProgrammeComparedToArray = item.comparaisons
        .map((comp) => comp.idProgrammeComparedTo)
        .filter((id): id is number => typeof id === 'number');

      const programmeToCompare = formatProgramme(
        firstComparaison?.programmeToCompare ?? null,
      );
      const programmeComparedTo = item.comparaisons
        .map((comp) => formatProgramme(comp.programmeComparedTo))
        .filter((prog): prog is NonNullable<typeof prog> => Boolean(prog));

      const averageSimilarity = item.averageSimilarity


      const totalGapsFromComparisons = item.comparaisons.reduce(
        (sum, comp) => sum + (comp.nombreEcart ?? 0),
        0,
      );

      return {
        id: item.id,
        id_ProgrammeToCompare: idProgrammeToCompare,
        id_ProgrammeComparedToArray: idProgrammeComparedToArray,
        // TauxDeSimilarite: tauxDeSimilarite,
        averageSimilarity:
          averageSimilarity,
        totalGaps: item.totalGaps ?? totalGapsFromComparisons,
        createdAt: item.createdAt,
        updatedAt: item.createdAt,
        createdBy: firstComparaison?.createdById ?? item.createdById ?? null,
        updatedBy: null,
        ProgrammeToCompare: programmeToCompare,
        ProgrammeComparedTo: programmeComparedTo,
      };
    });

    return {
      status: 'success',
      code: '200',
      data: {
        items,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          limitPerPage: limitNum,
          totalCount: total,
        },
      },
    };
  }

  async getMultiComparaisonById(id: number, page?: number, limit?: number) {
    const prisma = this.prisma;
    const pageNum = page || 1;
    const limitNum = limit || 10;
    const skip = (pageNum - 1) * limitNum;

    const multiComparaison = await prisma.multiComparaison.findUnique({
      where: { id },
      include: {
        comparaisons: {
          include: {
            programmeToCompare: {
              select: {
                id: true,
                nomProgramme: true,
                nomProgrammeEn: true,
              },
            },
            programmeComparedTo: {
              select: {
                id: true,
                nomProgramme: true,
                nomProgrammeEn: true,
                secteur: true,
                secteurEn: true,
              },
            },
          },
          orderBy: { id: 'desc' },
        },
      },
    });

    if (!multiComparaison || !multiComparaison.comparaisons.length) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode,
      );
    }

    const firstComparaison = multiComparaison.comparaisons[0];
    const idProgrammeComparable =
      firstComparaison?.idProgrammeToCompare ?? null;
    const programmeComparable = firstComparaison?.programmeToCompare;

    // Get all comparisons for statistics
    const allComparisons = multiComparaison.comparaisons;
    const comparisonIds = allComparisons.map((c) => c.id);

    // Calculate average similarity
    const similarities = allComparisons
      .map((c) => {
        const taux = c.tauxDeSimilarite
          ? parseFloat(c.tauxDeSimilarite.toString())
          : null;
        return taux !== null && !isNaN(taux) && taux >= 0 && taux <= 1
          ? taux
          : null;
      })
      .filter((t): t is number => t !== null);

    const averageSimilarity =
      similarities.length > 0
        ? similarities.reduce((a, b) => a + b, 0) / similarities.length
        : multiComparaison.averageSimilarity
          ? parseFloat(multiComparaison.averageSimilarity.toString())
          : 0;

    // Find most similar programme
    let mostSimilarProgramme: {
      programmeName: string;
      programmeName_en: string;
      similarityRate: number;
    } | null = null;

    if (similarities.length > 0) {
      const maxSimilarity = Math.max(...similarities);
      const mostSimilarComp = allComparisons.find((c) => {
        const taux = c.tauxDeSimilarite
          ? parseFloat(c.tauxDeSimilarite.toString())
          : null;
        return taux !== null && Math.abs(taux - maxSimilarity) < 0.0001;
      });

      if (mostSimilarComp?.programmeComparedTo) {
        mostSimilarProgramme = {
          programmeName: mostSimilarComp.programmeComparedTo.nomProgramme || '',
          programmeName_en:
            mostSimilarComp.programmeComparedTo.nomProgrammeEn || '',
          similarityRate: maxSimilarity,
        };
      }
    }

    // Calculate total gaps
    const totalGaps =
      multiComparaison.totalGaps ??
      allComparisons.reduce((sum, c) => sum + (c.nombreEcart ?? 0), 0);

    // Compute common gaps (écarts) across all compared programmes,
    // following the legacy MultiComparisonServiceForGaps.getCommonGaps logic.
    // For each comparaison, we fetch its ecarts and then find gap names
    // that appear in ALL comparisons. Include code_module and code_objectif for display.
    type EcartItem = {
      nom_sousmodule?: string | null;
      description_sousmodule?: string | null;
      nom_sousmodule_en?: string | null;
      description_sousmodule_en?: string | null;
      Code_Module?: string | null;
      Code_Objectif?: string | null;
    };

    const ecartResponses = await Promise.all(
      allComparisons.map((comp) =>
        this.comparaisonService.getEcartByComparaisonId(comp.id),
      ),
    );

    const gapMap = new Map<
      string,
      {
        fr: string;
        en: string;
        code_module: string | null;
        code_objectif: string | null;
        comparisonIds: Set<number>;
      }
    >();

    type EcartResponse = {
      data?: unknown;
    };

    ecartResponses.forEach((resp, index) => {
      const comp = allComparisons[index];
      const compId = comp.id;
      const parsedResp = resp as EcartResponse;
      const data = Array.isArray(parsedResp.data)
        ? (parsedResp.data as EcartItem[])
        : [];

      data.forEach((gap) => {
        const frName = (
          gap.nom_sousmodule ||
          gap.description_sousmodule ||
          ''
        ).trim();
        const enName = (
          gap.nom_sousmodule_en ||
          gap.description_sousmodule_en ||
          ''
        ).trim();

        if (!frName && !enName) return;

        const key = frName || enName;
        const codeModule = gap.Code_Module ?? null;
        const codeObjectif = gap.Code_Objectif ?? null;
        if (!gapMap.has(key)) {
          gapMap.set(key, {
            fr: frName || enName,
            en: enName,
            code_module: codeModule,
            code_objectif: codeObjectif,
            comparisonIds: new Set<number>(),
          });
        }
        gapMap.get(key)!.comparisonIds.add(compId);
      });
    });

    const commonGaps = Array.from(gapMap.values()).filter(
      (gap) => gap.comparisonIds.size === comparisonIds.length,
    );

    // Paginate compared programmes
    const paginatedComparisons = allComparisons.slice(skip, skip + limitNum);
    const totalComparisons = allComparisons.length;

    const comparedToProgrammes = paginatedComparisons.map((comp) => ({
      comparedToId: comp.idProgrammeComparedTo ?? null,
      comparedToName: comp.programmeComparedTo?.nomProgramme ?? '',
      comparedToName_en: comp.programmeComparedTo?.nomProgrammeEn ?? '',
      TauxSimilarité: comp.tauxDeSimilarite
        ? parseFloat(comp.tauxDeSimilarite.toString())
        : null,
      UniComparaisonId: comp.id,
      GapsNumber: comp.nombreEcart ?? 0,
    }));

    return {
      success: true,
      data: {
        comparaisonID: multiComparaison.id,
        id_Programme_Comparable: idProgrammeComparable,
        Nom_Programme_Comparable: programmeComparable?.nomProgramme ?? '',
        Nom_Programme_Comparable_en: programmeComparable?.nomProgrammeEn ?? '',
        comparedTo_Programmes: comparedToProgrammes,
        averageSimilarity,
        coverageRate: 0, // TODO: Calculate coverage rate if needed
        mostSimilarProgramme: mostSimilarProgramme ?? {
          programmeName: '',
          programmeName_en: '',
          similarityRate: 0,
        },
        totalCommonObjectives: commonGaps.length,
        totalGaps,
        commun: {
          nombre: commonGaps.length,
          noms: commonGaps.map((obj) => obj.fr).filter(Boolean),
          noms_en: commonGaps.map((obj) => obj.en).filter(Boolean),
          gaps: commonGaps.map((obj) => ({
            nom: obj.fr || obj.en,
            nom_en: obj.en || obj.fr,
            code_module: obj.code_module,
            code_objectif: obj.code_objectif,
          })),
        },
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalComparisons / limitNum),
          limitPerPage: limitNum,
          totalCount: totalComparisons,
        },
      },
    };
  }

  /**
   * Get gaps (ecarts) for all simple comparisons inside a multi-comparaison,
   * enriched with module/submodule metadata and per-programme existence flags.
   */
  async getGapsByMultiComparaisonId(
    multiComparaisonId: number,
    page?: number,
    limit?: number,
    filters?: MultiComparaisonGapsFilters,
  ) {
    const prisma = this.prisma;
    const pageNum = page && page > 0 ? page : 1;
    const limitNum = limit && limit > 0 ? limit : 10;

    // Load all comparisons with programme names
    const comparaisons = await prisma.comparaison.findMany({
      where: { idMultiComparaison: multiComparaisonId },
      include: {
        programmeToCompare: {
          select: {
            id: true,
            nomProgramme: true,
            nomProgrammeEn: true,
          },
        },
        programmeComparedTo: {
          select: {
            id: true,
            nomProgramme: true,
            nomProgrammeEn: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    if (!comparaisons.length) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode,
      );
    }

    // Determine which comparaisons to inspect based on programme filter
    const programmeFilterSet =
      filters?.programmeIds && filters.programmeIds.length > 0
        ? new Set(filters.programmeIds)
        : null;

    const targetComparaisons = programmeFilterSet
      ? comparaisons.filter(
        (comp) =>
          typeof comp.idProgrammeComparedTo === 'number' &&
          programmeFilterSet.has(comp.idProgrammeComparedTo),
      )
      : comparaisons;

    const comparaisonLookup =
      targetComparaisons.length > 0 ? targetComparaisons : comparaisons;

    // Collect ecarts from each comparaison
    type EcartRow = {
      module_id: number | null;
      nom_module: string | null;
      submodule_id: number | null;
      nom_sousmodule: string | null;
      description_sousmodule: string | null;
      Code_Objectif: string | null;
      Code_Module?: string | null;
      comparaisonId: number;
      programmeName: string | null;
      programmeNameEn: string | null;
      programmeComparedToId: number | null;
      programmeComparedToName: string | null;
    };

    const allEcarts: EcartRow[] = [];
    for (const comp of targetComparaisons) {
      const ecartResponse =
        await this.comparaisonService.getEcartByComparaisonId(comp.id);
      const ecartData = Array.isArray(ecartResponse?.data)
        ? (ecartResponse.data as Array<Record<string, unknown>>)
        : [];

      ecartData.forEach((e) => {
        allEcarts.push({
          module_id: typeof e.module_id === 'number' ? e.module_id : null,
          nom_module: typeof e.nom_module === 'string' ? e.nom_module : null,
          submodule_id:
            typeof e.submodule_id === 'number' ? e.submodule_id : null,
          nom_sousmodule:
            typeof e.nom_sousmodule === 'string' ? e.nom_sousmodule : null,
          description_sousmodule:
            typeof e.description_sousmodule === 'string'
              ? e.description_sousmodule
              : null,
          Code_Objectif:
            typeof e.Code_Objectif === 'string' ? e.Code_Objectif : null,
          Code_Module: typeof e.Code_Module === 'string' ? e.Code_Module : null,
          comparaisonId: comp.id,
          programmeName: comp.programmeComparedTo?.nomProgramme ?? null,
          programmeNameEn: comp.programmeComparedTo?.nomProgrammeEn ?? null,
          programmeComparedToId: comp.idProgrammeComparedTo ?? null,
          programmeComparedToName:
            comp.programmeComparedTo?.nomProgramme ?? null,
        });
      });
    }

    // Build a presence map: for each submodule (gap), track in which
    // compared programmes it appears as an ecart. This is based on the
    // returned ecarts per comparaison, not on database existence.
    const submoduleEcartPresence = new Map<number, Set<number>>();
    allEcarts.forEach((e) => {
      if (
        typeof e.submodule_id === 'number' &&
        typeof e.programmeComparedToId === 'number'
      ) {
        if (!submoduleEcartPresence.has(e.submodule_id)) {
          submoduleEcartPresence.set(e.submodule_id, new Set<number>());
        }
        submoduleEcartPresence
          .get(e.submodule_id)!
          .add(e.programmeComparedToId);
      }
    });

    // Determine which compared-to programmes to include in `programmes[]`
    const programmeComparedToIds = programmeFilterSet
      ? Array.from(programmeFilterSet)
      : Array.from(
        new Set(
          comparaisonLookup
            .map((c) => c.idProgrammeComparedTo)
            .filter((id): id is number => typeof id === 'number'),
        ),
      );

    // Build existence map: submoduleId -> Set(programmeComparedToId where it exists)
    // Apply "commun" filter:
    // return only ecarts that are gaps in ALL selected compared programmes,
    // based on the ecarts returned for each comparaison.
    let effectiveEcarts = allEcarts;
    if (filters?.commun && programmeComparedToIds.length > 0) {
      // Keep only submodules that are gaps in ALL selected programmes
      const commonEcarts = allEcarts.filter((e) => {
        if (typeof e.submodule_id !== 'number') return false;
        const existsSet =
          submoduleEcartPresence.get(e.submodule_id) ?? new Set<number>();
        return programmeComparedToIds.every((pid) => existsSet.has(pid));
      });

      // Deduplicate by submodule_id so each common gap appears only once,
      // regardless of how many underlying comparisons produced it.
      const uniqueBySubmodule = new Map<number, EcartRow>();
      commonEcarts.forEach((e) => {
        if (typeof e.submodule_id !== 'number') return;
        if (!uniqueBySubmodule.has(e.submodule_id)) {
          uniqueBySubmodule.set(e.submodule_id, e);
        }
      });

      effectiveEcarts = Array.from(uniqueBySubmodule.values());
    }

    if (!effectiveEcarts.length) {
      return {
        success: true,
        data: {
          multiComparaisonId,
          id_Programme_Comparable: comparaisons[0].idProgrammeToCompare,
          Nom_Programme_Comparable:
            comparaisons[0].programmeToCompare?.nomProgramme ?? '',
          Nom_Programme_Comparable_en:
            comparaisons[0].programmeToCompare?.nomProgrammeEn ?? '',
          ecart: [],
          pagination: {
            currentPage: pageNum,
            totalPages: 0,
            limitPerPage: limitNum,
            totalCount: 0,
          },
        },
      };
    }

    // Enrich ecarts with module / sous-module details
    const moduleIds = Array.from(
      new Set(
        effectiveEcarts
          .map((e) => e.module_id)
          .filter((id): id is number => typeof id === 'number'),
      ),
    );
    const submoduleIds = Array.from(
      new Set(
        effectiveEcarts
          .map((e) => e.submodule_id)
          .filter((id): id is number => typeof id === 'number'),
      ),
    );

    type ModuleWithSousModules = {
      id: number;
      nomModule: string | null;
      nomModuleEn: string | null;
      dureeEnHeures: number | null;
      sousModules: { id: number }[];
    };

    type SousModuleWithMeta = {
      id: number;
      nomSousModule: string | null;
      nomSousModuleEn: string | null;
      codeObjectif: string | null;
    };

    const modulesRaw = moduleIds.length
      ? await prisma.module.findMany({
        where: { id: { in: moduleIds } },
        select: {
          id: true,
          nomModule: true,
          nomModuleEn: true,
          dureeEnHeures: true,
          sousModules: {
            select: { id: true },
          },
        },
      })
      : [];

    const sousModulesRaw = submoduleIds.length
      ? await prisma.sousModule.findMany({
        where: { id: { in: submoduleIds } },
        select: {
          id: true,
          nomSousModule: true,
          nomSousModuleEn: true,
          codeObjectif: true,
        },
      })
      : [];

    const modules = modulesRaw as ModuleWithSousModules[];
    const sousModules = sousModulesRaw as SousModuleWithMeta[];

    const moduleMap = new Map<
      number,
      {
        nomModule: string | null;
        nomModuleEn: string | null;
        dureeEnHeures: number | null;
        submoduleCount: number;
      }
    >();
    modules.forEach((m) => {
      moduleMap.set(m.id, {
        nomModule: m.nomModule ?? null,
        nomModuleEn: m.nomModuleEn ?? null,
        dureeEnHeures:
          typeof m.dureeEnHeures === 'number' ? m.dureeEnHeures : null,
        submoduleCount: Array.isArray(m.sousModules) ? m.sousModules.length : 0,
      });
    });

    const subModuleMap = new Map<
      number,
      {
        nomSousModule: string | null;
        nomSousModuleEn: string | null;
        codeObjectif: string | null;
      }
    >();
    sousModules.forEach((s) => {
      subModuleMap.set(s.id, {
        nomSousModule: s.nomSousModule ?? null,
        nomSousModuleEn: s.nomSousModuleEn ?? null,
        codeObjectif: s.codeObjectif ?? null,
      });
    });

    const totalCount = effectiveEcarts.length;
    const paginatedEcarts = effectiveEcarts.slice(
      (pageNum - 1) * limitNum,
      (pageNum - 1) * limitNum + limitNum,
    );

    // Map from programmeComparedTo id to programme names
    const programmeNameMap = new Map<
      number,
      { nomProgramme: string; nomProgrammeEn: string }
    >();
    comparaisonLookup.forEach((c) => {
      if (
        typeof c.idProgrammeComparedTo === 'number' &&
        c.programmeComparedTo
      ) {
        programmeNameMap.set(c.idProgrammeComparedTo, {
          nomProgramme: c.programmeComparedTo.nomProgramme ?? '',
          nomProgrammeEn: c.programmeComparedTo.nomProgrammeEn ?? '',
        });
      }
    });

    const ecart = paginatedEcarts.map((e) => {
      const moduleInfo = e.module_id ? moduleMap.get(e.module_id) : undefined;
      const submoduleInfo = e.submodule_id
        ? subModuleMap.get(e.submodule_id)
        : undefined;

      const programmes = programmeComparedToIds.map((programmeId) => {
        const info = programmeNameMap.get(programmeId);
        const presenceSet =
          typeof e.submodule_id === 'number'
            ? (submoduleEcartPresence.get(e.submodule_id) ?? new Set<number>())
            : new Set<number>();
        const exists = presenceSet.has(programmeId);

        return {
          id: programmeId,
          nomprogramcomparedto: info?.nomProgramme ?? '',
          nomprogramcomparedto_en: info?.nomProgrammeEn ?? '',
          exists,
        };
      });

      return {
        module_id: e.module_id,
        code_module: e.Code_Module ?? null,
        nom_module: moduleInfo?.nomModule ?? e.nom_module,
        nom_module_en: moduleInfo?.nomModuleEn ?? null,
        submodule_id: e.submodule_id,
        nom_sousmodule: submoduleInfo?.nomSousModule ?? e.nom_sousmodule,
        nom_sousmodule_en: submoduleInfo?.nomSousModuleEn ?? null,
        description_sousmodule:
          submoduleInfo?.nomSousModule ?? e.description_sousmodule,
        description_sousmodule_en: submoduleInfo?.nomSousModuleEn ?? null,
        duree_en_heures: moduleInfo?.dureeEnHeures
          ? String(moduleInfo.dureeEnHeures)
          : null,
        submodule_count: moduleInfo?.submoduleCount ?? null,
        Code_Objectif: submoduleInfo?.codeObjectif ?? e.Code_Objectif ?? null,
        programmes,
        UniComparaisonId: e.comparaisonId,
        idProgrammeComparedTo: e.programmeComparedToId,
        NomProgrammeComparedTo: e.programmeComparedToName ?? '',
      };
    });

    const first = comparaisons[0];
    return {
      success: true,
      data: {
        multiComparaisonId,
        id_Programme_Comparable: first.idProgrammeToCompare,
        Nom_Programme_Comparable: first.programmeToCompare?.nomProgramme ?? '',
        Nom_Programme_Comparable_en:
          first.programmeToCompare?.nomProgrammeEn ?? '',
        ecart,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalCount / limitNum),
          limitPerPage: limitNum,
          totalCount,
        },
      },
    };
  }

  async getSimilarObjectivesByMultiComparaisonId(
    multiComparaisonId: number,
    page?: number,
    limit?: number,
    programmeIds?: number[],
  ) {
    const prisma = this.prisma;
    const pageNum = page && page > 0 ? page : 1;
    const limitNum = limit && limit > 0 ? limit : 10;

    const multiComparaison = await prisma.multiComparaison.findUnique({
      where: { id: multiComparaisonId },
      include: {
        comparaisons: {
          include: {
            programmeToCompare: {
              select: {
                id: true,
                nomProgramme: true,
                nomProgrammeEn: true,
              },
            },
            programmeComparedTo: {
              select: {
                id: true,
                nomProgramme: true,
                nomProgrammeEn: true,
              },
            },
          },
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!multiComparaison || !multiComparaison.comparaisons.length) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode,
      );
    }

    const allComparaisons = multiComparaison.comparaisons;
    const programmeFilterSet =
      programmeIds && programmeIds.length > 0
        ? new Set<number>(programmeIds)
        : null;

    const filteredComparaisons = programmeFilterSet
      ? allComparaisons.filter(
        (comp) =>
          typeof comp.idProgrammeComparedTo === 'number' &&
          programmeFilterSet.has(comp.idProgrammeComparedTo),
      )
      : allComparaisons;

    if (!filteredComparaisons.length) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode,
      );
    }

    const firstComparaison = allComparaisons[0];
    const programmeComparable = firstComparaison.programmeToCompare;

    // Get source programme modules to build the structure
    const sourceProgrammeId = firstComparaison.idProgrammeToCompare;
    if (!sourceProgrammeId) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode,
      );
    }

    // Build modulesAl structure by aggregating similarities from all comparisons
    type ModulesAlEntry = unknown[];
    const aggregatedModulesAl: ModulesAlEntry[] = [];

    // Get source modules with sous-modules
    const sourceModules = await prisma.module.findMany({
      where: { idProgramme: sourceProgrammeId },
      select: {
        id: true,
        nomModule: true,
        nomModuleEn: true,
        codeModule: true,
        dureeEnHeures: true,
        sousModules: {
          select: {
            id: true,
            nomSousModule: true,
            nomSousModuleEn: true,
            codeObjectif: true,
          },
        },
      },
    });

    // Preload all similarities for the filtered comparaisons in a single query
    const comparaisonIds = filteredComparaisons
      .map((comp) => comp.id)
      .filter((id): id is number => typeof id === 'number');

    const comparaisonIdToProgramme = new Map<
      number,
      { programmeId: number; programmeName: string; programmeNameEn: string }
    >();

    for (const comp of filteredComparaisons) {
      if (!comp.idProgrammeComparedTo) continue;
      comparaisonIdToProgramme.set(comp.id, {
        programmeId: comp.idProgrammeComparedTo,
        programmeName: comp.programmeComparedTo?.nomProgramme || '',
        programmeNameEn: comp.programmeComparedTo?.nomProgrammeEn || '',
      });
    }

    const allSimilarities = await prisma.sousModuleSimilarite.findMany({
      where: {
        comparaisonId: {
          in: comparaisonIds,
        },
      },
      select: {
        id: true,
        comparaisonId: true,
        idSousModuleComparable: true,
        idSousModuleComparedTo: true,
        sousModuleComparable: {
          select: {
            id: true,
            nomSousModule: true,
            nomSousModuleEn: true,
            codeObjectif: true,
            idModule: true,
            module: {
              select: {
                nomModule: true,
                nomModuleEn: true,
                codeModule: true,
              },
            },
          },
        },
        sousModuleComparedTo: {
          select: {
            id: true,
            nomSousModule: true,
            nomSousModuleEn: true,
            codeObjectif: true,
          },
        },
      },
    });

    // Group similarities by referent sous-module id (idSousModuleComparedTo)
    const similaritiesByReferent = new Map<
      number,
      typeof allSimilarities
    >();

    for (const sim of allSimilarities) {
      if (!sim.idSousModuleComparedTo) continue;
      const key = sim.idSousModuleComparedTo;
      const list = similaritiesByReferent.get(key);
      if (list) {
        list.push(sim);
      } else {
        similaritiesByReferent.set(key, [sim]);
      }
    }

    // Process each source module
    for (const sourceModule of sourceModules) {
      const duree =
        sourceModule.dureeEnHeures !== null &&
          sourceModule.dureeEnHeures !== undefined
          ? String(sourceModule.dureeEnHeures)
          : null;
      const moduleInfoFR = `${sourceModule.nomModule || ''},${sourceModule.codeModule || '0'},${duree || ''}`;
      const moduleInfoEN = `${sourceModule.nomModuleEn || ''},${sourceModule.codeModule || '0'},${duree || ''}`;

      // Build objectives array for this module
      const objectives: unknown[] = [];

      for (const sourceSousModule of sourceModule.sousModules) {
        const referentSousModuleId = sourceSousModule.id;
        const simsForReferent =
          similaritiesByReferent.get(referentSousModuleId) || [];

        if (!simsForReferent.length) continue;

        // Map: programmeId -> similaires[]
        const programmeMap = new Map<
          number,
          Array<{
            Nom_Sous_Module_Similaire: string;
            Nom_Sous_Module_Similaire_en: string;
            id_Similaire: number;
            CodeModuleTn: string;
            Code_Competence: string;
            ModuleTn: string;
            ModuleTn_en: string;
            Code_Module: string;
          }>
        >();

        for (const sim of simsForReferent) {
          if (
            !sim.sousModuleComparable ||
            !sim.sousModuleComparedTo ||
            !sim.sousModuleComparable.module
          ) {
            continue;
          }

          const comparaisonId = sim.comparaisonId;
          if (comparaisonId == null) continue;

          const compInfo = comparaisonIdToProgramme.get(comparaisonId);
          if (!compInfo) continue;

          const programmeId = compInfo.programmeId;
          if (!programmeMap.has(programmeId)) {
            programmeMap.set(programmeId, []);
          }

          const similaires = programmeMap.get(programmeId)!;

          const similarSousModule = sim.sousModuleComparable;
          const similarModule = sim.sousModuleComparable.module;

          const exists = similaires.some(
            (s) => s.id_Similaire === similarSousModule.id,
          );

          if (!exists) {
            similaires.push({
              Nom_Sous_Module_Similaire: similarSousModule.nomSousModule || '',
              Nom_Sous_Module_Similaire_en:
                similarSousModule.nomSousModuleEn || '',
              id_Similaire: similarSousModule.id,
              CodeModuleTn: similarModule.codeModule || '',
              Code_Competence: similarSousModule.codeObjectif || '',
              ModuleTn: similarModule.nomModule || '',
              ModuleTn_en: similarModule.nomModuleEn || '',
              Code_Module: sourceModule.codeModule || '',
            });
          }
        }

        if (!programmeMap || programmeMap.size === 0) continue;

        // Build Sous_Module_Similaires_Par_Programme array
        const similairesParProgramme: unknown[] = [];

        for (const comp of filteredComparaisons) {
          if (!comp.idProgrammeComparedTo) continue;
          const programmeId = comp.idProgrammeComparedTo;
          const programmeName = comp.programmeComparedTo?.nomProgramme || '';
          const programmeNameEn =
            comp.programmeComparedTo?.nomProgrammeEn || '';

          const similaires = programmeMap.get(programmeId) || [];

          if (similaires.length > 0) {
            // Get module info for the first similar (they should all be from same module)
            const firstSim = similaires[0];
            similairesParProgramme.push({
              ProgrammeId: programmeId,
              ProgrammeTn: programmeName,
              ProgrammeTn_en: programmeNameEn,
              ModuleTn: firstSim.ModuleTn,
              ModuleTn_en: firstSim.ModuleTn_en,
              Code_Module_Tn: firstSim.CodeModuleTn,
              Sous_Module_Similaires: similaires.map((s) => ({
                Nom_Sous_Module_Similaire: s.Nom_Sous_Module_Similaire,
                Nom_Sous_Module_Similaire_en: s.Nom_Sous_Module_Similaire_en,
                id_Similaire: s.id_Similaire,
                CodeModuleTn: s.CodeModuleTn,
                Code_Competence: s.Code_Competence,
              })),
            });
          }
        }

        if (similairesParProgramme.length > 0) {
          objectives.push({
            id: referentSousModuleId,
            Code_Objectif: sourceSousModule.codeObjectif,
            Code_Module: sourceModule.codeModule,
            Nom_Sous_Module_Referent: sourceSousModule.nomSousModule || '',
            Nom_Sous_Module_Referent_en: sourceSousModule.nomSousModuleEn || '',
            Sous_Module_Similaires_Par_Programme: similairesParProgramme,
          });
        }
      }

      if (objectives.length > 0) {
        aggregatedModulesAl.push([
          {
            module: moduleInfoFR,
            module_en: moduleInfoEN,
          },
          ...objectives,
        ]);
      }
    }

    // Apply pagination to modulesAl (paginate by modules, not objectives)
    const totalModules = aggregatedModulesAl.length;
    const paginatedModulesAl = aggregatedModulesAl.slice(
      (pageNum - 1) * limitNum,
      (pageNum - 1) * limitNum + limitNum,
    );

    const programmes = filteredComparaisons
      .map((comp) => ({
        id: comp.idProgrammeComparedTo ?? null,
        name: comp.programmeComparedTo?.nomProgramme ?? '',
        name_en: comp.programmeComparedTo?.nomProgrammeEn ?? '',
      }))
      .filter(
        (p, index, self) =>
          p.id !== null &&
          index === self.findIndex((other) => other.id === p.id),
      );

    return {
      status: 'success',
      code: '200',
      data: {
        multiComparaisonId,
        id_Programme_Comparable: programmeComparable?.id ?? null,
        Nom_Programme_Comparable: programmeComparable?.nomProgramme ?? '',
        Nom_Programme_Comparable_en: programmeComparable?.nomProgrammeEn ?? '',
        modulesAl: paginatedModulesAl,
        programmes,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalModules / limitNum),
          limitPerPage: limitNum,
          totalCount: totalModules,
        },
        filters: {
          programmeIds:
            programmeIds && programmeIds.length ? programmeIds : undefined,
        },
      },
    };
  }

  /**
   * Get classification data for all comparaisons under a multi-comparaison.
   * Also returns, for each comparaison_id, the corresponding compared-to
   * programme (id, FR and EN names).
   */
  async getMultiComparaisonClassifications(multiComparaisonId: number) {
    const prisma = this.prisma;
    const multiComparaison = await prisma.multiComparaison.findUnique({
      where: { id: multiComparaisonId },
      include: {
        comparaisons: {
          select: {
            id: true,
            idProgrammeComparedTo: true,
            programmeComparedTo: {
              select: {
                id: true,
                nomProgramme: true,
                nomProgrammeEn: true,
              },
            },
          },
        },
      },
    });

    if (!multiComparaison) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode,
      );
    }

    const results: Array<{
      comparaison_id: number;
      comparedToId: number | null;
      comparedToName: string;
      comparedToName_en: string;
      data?: unknown;
      error?: string;
    }> = [];

    for (const comp of multiComparaison.comparaisons) {
      try {
        const classification =
          await this.comparaisonService.getAllClassificationList(comp.id);
        results.push({
          comparaison_id: comp.id,
          comparedToId: comp.idProgrammeComparedTo ?? null,
          comparedToName: comp.programmeComparedTo?.nomProgramme ?? '',
          comparedToName_en: comp.programmeComparedTo?.nomProgrammeEn ?? '',
          data:
            (classification as Record<string, unknown>)?.data ?? classification,
        });
      } catch (error: unknown) {
        results.push({
          comparaison_id: comp.id,
          comparedToId: comp.idProgrammeComparedTo ?? null,
          comparedToName: comp.programmeComparedTo?.nomProgramme ?? '',
          comparedToName_en: comp.programmeComparedTo?.nomProgrammeEn ?? '',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successful = results.filter((r) => !r.error).length;
    const failed = results.filter((r) => r.error).length;

    return {
      status: 'success',
      code: '200',
      data: {
        multiComparaisonId,
        results,
        totalComparaisons: results.length,
        totalSuccessful: successful,
        totalFailed: failed,
      },
    };
  }

  async deleteMultiComparaison(id: number) {
    const prisma = this.prisma;

    try {
      const multiComparaison = await prisma.multiComparaison.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!multiComparaison) {
        throw new ApiError(
          `Multi-comparison with ID ${id} not found`,
          errors.NOT_FOUND.code,
          errors.NOT_FOUND.errorCode,
        );
      }

      await prisma.comparaison.deleteMany({
        where: { idMultiComparaison: id },
      });

      const deleted = await prisma.multiComparaison.delete({
        where: { id },
      });

      return {
        status: 'success',
        code: '200',
        data: deleted,
      };
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new ApiError(
          `Multi-comparison with ID ${id} not found`,
          errors.NOT_FOUND.code,
          errors.NOT_FOUND.errorCode,
        );
      }

      throw error;
    }
  }

  async exportAllMultiComparaisonsCsv(
    lang: 'fr' | 'en' = 'fr',
  ): Promise<Buffer> {
    const useEnglish = lang === 'en';

    const LABELS = {
      fr: {
        REF: 'Référence',
        PROGRAMME_BASE: 'Programme à comparer',
        PROGRAMMES: 'Programmes comparables',
        RATE: 'Taux de similarité moyen',
        GAPS: 'Total des écarts',
        DATE: 'Date de comparaison',
      },
      en: {
        REF: 'Reference',
        PROGRAMME_BASE: 'Programme To Compare',
        PROGRAMMES: 'Compared Programmes',
        RATE: 'Average Similarity Rate',
        GAPS: 'Total Gaps',
        DATE: 'Comparison Date',
      },
    } as const;

    const L = LABELS[lang];

    const rows = await this.prisma.multiComparaison.findMany({
      select: {
        id: true,
        averageSimilarity: true,
        totalGaps: true,
        createdAt: true,
        comparaisons: {
          select: {
            programmeToCompare: {
              select: {
                nomProgramme: true,
                nomProgrammeEn: true,
              },
            },
            tauxDeSimilarite: true,
            programmeComparedTo: {
              select: {
                nomProgramme: true,
                nomProgrammeEn: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = rows.map((item) => {
      const first = item.comparaisons[0];

      const programmeToCompare = useEnglish
        ? (first?.programmeToCompare?.nomProgrammeEn ?? '')
        : (first?.programmeToCompare?.nomProgramme ?? '');

      const comparedProgrammes = item.comparaisons
        .map((c) =>
          useEnglish
            ? (c.programmeComparedTo?.nomProgrammeEn ?? '')
            : (c.programmeComparedTo?.nomProgramme ?? ''),
        )
        .filter(Boolean)
        .join(' ; ');



      const similarities = item.comparaisons
        .map(c => Number(c.tauxDeSimilarite))
        .filter(v => !isNaN(v));

      const avgSimilarity =
        similarities.length > 0
          ? similarities.reduce((a, b) => a + b, 0) / similarities.length
          : null;

      const similarity = avgSimilarity !== null
        ? `${(avgSimilarity * 100).toFixed(2)} %`
        : 'N/A';


      return {
        [L.REF]: item.id,
        [L.PROGRAMME_BASE]: programmeToCompare,
        [L.PROGRAMMES]: comparedProgrammes,
        [L.RATE]: similarity,
        [L.GAPS]: item.totalGaps ?? 0,
        [L.DATE]: item.createdAt.toISOString().split('T')[0],
      };
    });

    const csv = stringify(data, {
      header: true,
      delimiter: ';', // Excel FR compatible
    });

    // ✅ UTF-8 BOM (obligatoire pour Excel)
    const bom = Buffer.from('\uFEFF', 'utf-8');
    return Buffer.concat([bom, Buffer.from(csv, 'utf-8')]);
  }


  async triggerClassificationByMultiComparaison(
    idMultiComparaison: number,
  ): Promise<unknown> {
    // 1️⃣ Fetch comparaisons
    const comparaisons = await this.prisma.comparaison.findMany({
      where: { idMultiComparaison },
      select: { id: true },
    });

    if (comparaisons.length === 0) {
      return {
        status: 'success',
        code: '200',
        data: { message: 'No comparaisons found for this multiComparaison' },
      };
    }

    // 2️⃣ Process each comparaison
    const results = await Promise.all(
      comparaisons.map(async ({ id }) => {
        const ecarts =
          await this.simpleComparaisonService.getEcartsForClassification(id);

        const tasks = ecarts
          .filter((e) => e.nom_module && e.nom_sousmodule)
          .map((e) => ({
            module: e.nom_module!,
            ecart: e.nom_sousmodule!,
            module_en: e.nom_module_en!,
            ecart_en: e.nom_sousmodule_en!,
          }));

        if (tasks.length === 0) {
          return {
            comparaisonId: id,
            status: 'skipped',
            message: 'No ecarts to classify',
          };
        }

        const result = await this.simpleComparaisonService.ecartsClassification(
          { comparaison_id: id, tasks },
        );

        return {
          comparaisonId: id,
          status: 'processed',
          result,
        };
      }),
    );

    return {
      status: 'success',
      code: '200',
      data: results,
    };
  }
}
