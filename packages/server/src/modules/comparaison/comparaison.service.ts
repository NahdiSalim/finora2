import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ApiError } from '../../common/errors/api-error';
import { errors } from '../../common/errors/errors';
import { stringify } from 'csv-stringify/sync';

@Injectable()
export class ComparaisonService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async getAllComparaisons(
    page?: number,
    limit?: number,
    search?: string,
    startDate?: string,
    endDate?: string,
    margeMin?: number,
    margeMax?: number,
  ) {
    const pageNum = page || 1;
    const limitNum = limit || 5;
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.ComparaisonWhereInput = {};
    where.idMultiComparaison = null;

    if (startDate || endDate) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (startDate) createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        createdAt.lte = end;
      }
      where.createdAt = createdAt;
    }
    if (margeMin != null || margeMax != null) {
      const minRatio = margeMin != null ? margeMin / 100 : undefined;
      const maxRatio = margeMax != null ? margeMax / 100 : undefined;
      where.tauxDeSimilarite = {
        ...(minRatio != null && { gte: minRatio }),
        ...(maxRatio != null && { lte: maxRatio }),
      };
    }

    let searchProgrammeIds: number[] = [];

    if (search) {
      const matchingProgrammes = await this.prisma.programme.findMany({
        where: {
          nomProgramme: {
            contains: search,
            mode: 'insensitive',
          },
        },
        select: { id: true },
      });

      searchProgrammeIds = matchingProgrammes.map((p) => p.id);

      if (searchProgrammeIds.length === 0) {
        return {
          status: 'success',
          code: '200',
          data: [],
          pagination: {
            currentPage: pageNum,
            totalPages: 0,
            limitPerPage: limitNum,
            totalCount: 0,
          },
        };
      }

      where.OR = [
        { idProgrammeToCompare: { in: searchProgrammeIds } },
        { idProgrammeComparedTo: { in: searchProgrammeIds } },
      ];
    }

    // Use Prisma to fetch comparaisons first, then relations separately
    const [comparaisons, total] = await Promise.all([
      this.prisma.comparaison.findMany({
        where,
        select: {
          id: true,
          idProgrammeToCompare: true,
          idProgrammeComparedTo: true,
          tauxDeSimilarite: true,
          createdAt: true,
          updatedAt: true,
          createdById: true,
          updatedById: true,
          nombreEcart: true,
        },
        orderBy: {
          id: 'desc',
        },
        skip,
        take: limitNum,
      }),
      this.prisma.comparaison.count({ where }),
    ]);

    // Fetch programmes separately to avoid relation issues
    const programmeIdSet = new Set<number>();
    comparaisons.forEach((c) => {
      if (c.idProgrammeToCompare) programmeIdSet.add(c.idProgrammeToCompare);
      if (c.idProgrammeComparedTo) programmeIdSet.add(c.idProgrammeComparedTo);
    });

    const programmes =
      programmeIdSet.size > 0
        ? await this.prisma.programme.findMany({
            where: {
              id: { in: Array.from(programmeIdSet) },
            },
            select: {
              id: true,
              nomProgramme: true,
              nomProgrammeEn: true,
              secteur: true,
              secteurEn: true,
            },
          })
        : [];

    const programmeMap = new Map(programmes.map((p) => [p.id, p]));

    const formattedData = comparaisons.map((item) => ({
      id: item.id,
      id_ProgrammeToCompare: item.idProgrammeToCompare,
      id_ProgrammeComparedTo: item.idProgrammeComparedTo,
      TauxDeSimilarite: item.tauxDeSimilarite?.toString() || null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      createdBy: item.createdById || null,
      updatedBy: item.updatedById || null,
      nombreEcart: item.nombreEcart,
      // Some environments don't have the `id_MultiComparasion` column yet.
      // Keep response shape stable without selecting the column.
      idMultiComparaison: null,
      ProgrammeToCompare:
        item.idProgrammeToCompare && programmeMap.has(item.idProgrammeToCompare)
          ? {
              id: programmeMap.get(item.idProgrammeToCompare)!.id,
              Nom_Programme: programmeMap.get(item.idProgrammeToCompare)!
                .nomProgramme,
              Nom_Programme_en: programmeMap.get(item.idProgrammeToCompare)!
                .nomProgrammeEn,
              Secteur: programmeMap.get(item.idProgrammeToCompare)!.secteur,
              Secteur_en: programmeMap.get(item.idProgrammeToCompare)!
                .secteurEn,
            }
          : null,
      ProgrammeComparedTo:
        item.idProgrammeComparedTo &&
        programmeMap.has(item.idProgrammeComparedTo)
          ? {
              id: programmeMap.get(item.idProgrammeComparedTo)!.id,
              Nom_Programme: programmeMap.get(item.idProgrammeComparedTo)!
                .nomProgramme,
              Nom_Programme_en: programmeMap.get(item.idProgrammeComparedTo)!
                .nomProgrammeEn,
              Secteur: programmeMap.get(item.idProgrammeComparedTo)!.secteur,
              Secteur_en: programmeMap.get(item.idProgrammeComparedTo)!
                .secteurEn,
            }
          : null,
    }));

    return {
      status: 'success',
      code: '200',
      data: formattedData,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        limitPerPage: limitNum,
        totalCount: total,
      },
    };
  }

  async getComparaisonById(id: number) {
    const comparaison = await this.prisma.comparaison.findUnique({
      where: { id },
      include: {
        programmeToCompare: {
          select: {
            id: true,
            nomProgramme: true,
            nomProgrammeEn: true,
            secteur: true,
            secteurEn: true,
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
    });

    if (!comparaison) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode,
      );
    }

    return {
      status: 'success',
      code: '200',
      data: {
        comparaisonID: comparaison.id,
        id_Programme_Compare: comparaison.idProgrammeToCompare,
        Nom_Programme_Comapare:
          comparaison.programmeToCompare?.nomProgramme || null,
        Nom_Programme_Comapare_en:
          comparaison.programmeToCompare?.nomProgrammeEn || null,
        id_Programme_Comparable: comparaison.idProgrammeComparedTo,
        Nom_Programme_Comparable:
          comparaison.programmeComparedTo?.nomProgramme || null,
        Nom_Programme_Comparable_en:
          comparaison.programmeComparedTo?.nomProgrammeEn || null,
        TauxSimilarité: comparaison.tauxDeSimilarite?.toString() || null,
        nombreEcart: comparaison.nombreEcart,
        idMultiComparaison: comparaison.idMultiComparaison,
      },
    };
  }

  async createComparaison(
    idProgrammeToCompare: number,
    idProgrammeComparedTo: number,
    idParent?: number,
  ) {
    const backUrl = this.configService.get<string>('BACK_URL_COMPARAISON');
    const apiKey = this.configService.get<string>('API_KEY');

    if (!backUrl) {
      throw new ApiError(
        'BACK_URL_COMPARAISON is not configured in environment variables',
        errors.BAD_REQUEST.code,
        errors.BAD_REQUEST.errorCode,
      );
    }

    if (!apiKey) {
      throw new ApiError(
        'API_KEY is not configured in environment variables',
        errors.BAD_REQUEST.code,
        errors.BAD_REQUEST.errorCode,
      );
    }

    // Validate that both programmes exist in the database
    // Note: Validation is commented out but kept for potential future use
    await Promise.all([
      this.prisma.programme.findUnique({
        where: { id: idProgrammeToCompare },
      }),
      this.prisma.programme.findUnique({
        where: { id: idProgrammeComparedTo },
      }),
    ]);

    // Ensure the URL ends with a slash and append the endpoint
    const baseUrl = backUrl.endsWith('/') ? backUrl : `${backUrl}/`;
    const apiUrl = `${baseUrl}comparaison`;

    const requestBody: Record<string, unknown> = {
      id_ProgrammeAl: String(idProgrammeToCompare),
      id_ProgrammeTn: String(idProgrammeComparedTo),
      direction: 'DIRECT',
    };

    if (typeof idParent === 'number') {
      requestBody.idParent = String(idParent);
    }

    const jsonBody = JSON.stringify(requestBody);

    try {
      // Call the comparaison API
      const response: Response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          API_KEY: apiKey,
        },
        body: jsonBody,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Python API error: ${response.status}`;

        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.detail) {
            errorMessage += ` - ${errorJson.detail}`;
          } else {
            errorMessage += ` - ${errorText}`;
          }
        } catch {
          errorMessage += ` - ${errorText}`;
        }

        // For 503 errors, provide more helpful context
        if (response.status === 503) {
          errorMessage +=
            '. This usually means the programmes do not have the required data structure in the Python API database, or the Python API is experiencing issues processing the comparison.';
        }

        throw new ApiError(
          errorMessage,
          errors.BAD_REQUEST.code,
          errors.BAD_REQUEST.errorCode,
        );
      }

      const data = (await response.json()) as Record<string, unknown>;

      // Python API already saves the comparaison to the database.
      // We only expose the created comparaison ID to callers.
      const rawId = (data.id ?? data.comparaisonID ?? data.comparaisonId) as
        | number
        | undefined;

      if (typeof rawId !== 'number') {
        throw new ApiError(
          'Python API did not return a valid comparaison id',
          errors.BAD_REQUEST.code,
          errors.BAD_REQUEST.errorCode,
        );
      }

      // Fetch ecarts for this comparaison so the client can send them to classification
      const ecartsPayload = await this.getEcartsForClassification(rawId);

      return {
        status: 'success',
        code: '200',
        data: {
          id: rawId,
          ecarts: ecartsPayload,
        },
      };
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Failed to call Python API: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errors.BAD_REQUEST.code,
        errors.BAD_REQUEST.errorCode,
      );
    }
  }

  async deleteComparaison(id: number) {
    try {
      const comparaison = await this.prisma.comparaison.findUnique({
        where: { id },
        select: {
          id: true,
          idMultiComparaison: true,
        },
      });

      if (!comparaison) {
        throw new ApiError(
          errors.NOT_FOUND.message,
          errors.NOT_FOUND.code,
          errors.NOT_FOUND.errorCode,
        );
      }

      if (comparaison.idMultiComparaison !== null) {
        throw new ApiError(
          errors.CONFLICT.message,
          errors.CONFLICT.code,
          errors.CONFLICT.errorCode,
        );
      }

      const deleted = await this.prisma.comparaison.delete({
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
          errors.NOT_FOUND.message,
          errors.NOT_FOUND.code,
          errors.NOT_FOUND.errorCode,
        );
      }
      throw error;
    }
  }

  async getEcartByComparaisonId(
    comparaisonId: number,
    page?: number,
    limit?: number,
  ) {
    if (!comparaisonId) {
      throw new ApiError(
        'comparaison_id is required',
        errors.BAD_REQUEST.code,
        errors.BAD_REQUEST.errorCode,
      );
    }

    // Verify comparaison exists
    const comparaison = await this.prisma.comparaison.findUnique({
      where: { id: comparaisonId },
      select: {
        id: true,
        idProgrammeToCompare: true,
      },
    });

    if (!comparaison) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode,
      );
    }

    const pageNum = page || 1;
    const limitNum = limit || 10;
    const skip = (pageNum - 1) * limitNum;

    // Fetch all data in parallel to avoid N+1 queries
    const [modulesAlList, allSimilarities] = await Promise.all([
      // Get modules for programmeToCompare with sous-modules (FR & EN)
      this.prisma.module.findMany({
        where: { idProgramme: comparaison.idProgrammeToCompare },
        select: {
          id: true,
          nomModule: true,
          nomModuleEn: true,
          codeModule: true,
          sousModules: {
            select: {
              id: true,
              nomSousModule: true,
              nomSousModuleEn: true,
              codeObjectif: true,
            },
          },
        },
      }),
      // Get all similarities for this comparaison
      this.prisma.sousModuleSimilarite.findMany({
        where: { comparaisonId },
        select: {
          idSousModuleComparedTo: true,
        },
      }),
    ]);

    // Create a set of sous-module IDs that have similarities
    const sousModuleIdsWithSimilarities = new Set<number>();
    allSimilarities.forEach((sim) => {
      if (sim.idSousModuleComparedTo) {
        sousModuleIdsWithSimilarities.add(sim.idSousModuleComparedTo);
      }
    });

    const ecartList: unknown[] = [];

    // Process each module to find ecarts
    for (const module of modulesAlList) {
      // Get sous-modules for this module (already loaded)
      const sousModules = module.sousModules;

      // Check each sous-module for similar objectives
      for (const submodule of sousModules) {
        // If no similar objectives found, add to ecartList
        if (!sousModuleIdsWithSimilarities.has(submodule.id)) {
          ecartList.push({
            module_id: module.id,
            nom_module: module.nomModule,
            nom_module_en: module.nomModuleEn,
            submodule_id: submodule.id,
            nom_sousmodule: submodule.nomSousModule,
            nom_sousmodule_en: submodule.nomSousModuleEn,
            description_sousmodule: null,
            Code_Objectif: submodule.codeObjectif,
            Code_Module: module.codeModule,
          });
        }
      }
    }

    // Apply pagination
    const total = ecartList.length;
    const paginatedEcartList = ecartList.slice(skip, skip + limitNum);

    return {
      status: 'success',
      code: '200',
      data: paginatedEcartList,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        limitPerPage: limitNum,
        totalCount: total,
      },
    };
  }

  /**
   * Returns all ecarts for a comparaison (no pagination) for use in createComparaison
   * response and trigger-classification. Shape: { nom_module, nom_sousmodule }[].
   */
  async getEcartsForClassification(comparaisonId: number): Promise<
    Array<{
      nom_module: string | null;
      nom_sousmodule: string | null;
      nom_module_en: string | null;
      nom_sousmodule_en: string | null;
    }>
  > {
    const result = await this.getEcartByComparaisonId(
      comparaisonId,
      1,
      100_000,
    );
    const data = Array.isArray((result as { data?: unknown }).data)
      ? (
          result as {
            data: Array<{
              nom_module?: string | null;
              nom_module_en?: string | null;
              nom_sousmodule?: string | null;
              nom_sousmodule_en?: string | null;
            }>;
          }
        ).data
      : [];
    return data.map((item) => ({
      nom_module: item.nom_module ?? null,
      nom_sousmodule: item.nom_sousmodule ?? null,
      nom_module_en: item.nom_module_en ?? null,
      nom_sousmodule_en: item.nom_sousmodule_en ?? null,
    }));
  }

  /**
   * Fetches ecarts for a comparaison, builds tasks, and calls Python classification API.
   * Used when landing on the detail page so classification runs in the background.
   */
  async triggerClassification(comparaisonId: number): Promise<unknown> {
    const ecarts = await this.getEcartsForClassification(comparaisonId);
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
        status: 'success',
        code: '200',
        data: { message: 'No ecarts to classify' },
      };
    }
    return this.ecartsClassification({ comparaison_id: comparaisonId, tasks });
  }

  async getAllModulesByComparaisonId(comparaisonId: number) {
    if (!comparaisonId) {
      throw new ApiError(
        'comparaison_id is required',
        errors.BAD_REQUEST.code,
        errors.BAD_REQUEST.errorCode,
      );
    }

    // Get the comparison with programme relations
    const comparaison = await this.prisma.comparaison.findUnique({
      where: { id: comparaisonId },
      select: {
        id: true,
        idProgrammeToCompare: true,
        idProgrammeComparedTo: true,
        tauxDeSimilarite: true,
        programmeToCompare: {
          select: {
            nomProgramme: true,
            nomProgrammeEn: true,
          },
        },
        programmeComparedTo: {
          select: {
            nomProgramme: true,
            nomProgrammeEn: true,
          },
        },
      },
    });

    if (!comparaison) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode,
      );
    }

    // Fetch all data in parallel to avoid N+1 queries
    // Note: dureeEnHeures is fetched separately using Prisma.sql because the database
    // contains string values like "30 heures" instead of integers
    const [modulesTnList, modulesAlList, allSimilarities] = await Promise.all([
      // Get modules for programmeComparedTo (modulesTn) including dureeEnHeures
      this.prisma.module.findMany({
        where: { idProgramme: comparaison.idProgrammeComparedTo },
        select: {
          id: true,
          nomModule: true,
          nomModuleEn: true,
          dureeEnHeures: true,
        },
      }),
      // Get modules for programmeToCompare (modulesAl) with sous-modules and dureeEnHeures
      this.prisma.module.findMany({
        where: { idProgramme: comparaison.idProgrammeToCompare },
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
              codeObjectif: true,
            },
          },
        },
      }),
      // Get all similarities for this comparaison with related sous-modules and modules
      this.prisma.sousModuleSimilarite.findMany({
        where: { comparaisonId },
        select: {
          id: true,
          idSousModuleComparable: true,
          idSousModuleComparedTo: true,
          sousModuleComparable: {
            select: {
              id: true,
              nomSousModule: true,
              codeObjectif: true,
              idModule: true,
              module: {
                select: {
                  nomModule: true,
                  codeModule: true,
                },
              },
            },
          },
          sousModuleComparedTo: {
            select: {
              id: true,
              nomSousModule: true,
              codeObjectif: true,
            },
          },
        },
      }),
    ]);

    // Create lookup maps for faster access
    const similaritiesByComparedToId = new Map<
      number,
      typeof allSimilarities
    >();
    allSimilarities.forEach((sim) => {
      if (sim.idSousModuleComparedTo) {
        if (!similaritiesByComparedToId.has(sim.idSousModuleComparedTo)) {
          similaritiesByComparedToId.set(sim.idSousModuleComparedTo, []);
        }
        similaritiesByComparedToId.get(sim.idSousModuleComparedTo)!.push(sim);
      }
    });

    // Format modulesTn as strings
    const modulesTn = modulesTnList.map(
      (module) =>
        `${module.nomModule || ''},${module.dureeEnHeures?.toString() || ''}`,
    );

    // Format modulesTn_en as strings (English version) - no fallback to FR
    const modulesTnEn = modulesTnList.map(
      (module) =>
        `${module.nomModuleEn || ''},${module.dureeEnHeures?.toString() || ''}`,
    );

    const modulesAl: unknown[] = [];
    const ecartList: unknown[] = [];

    // Process each module in modulesAlList
    for (const module of modulesAlList) {
      // Get sous-modules for this module (already loaded)
      const sousModules = module.sousModules;

      // Initialize array for sous-modules grouped by moduleTn
      const sousModulesByModuleTn: unknown[][] = Array(modulesTn.length)
        .fill(null)
        .map(() => []);

      // Collect unique Code_Objectif values
      const codeObjectifsSet = new Set<string>();

      // Process each sous-module
      for (const submodule of sousModules) {
        // Find similar objectives for this sous-module (from pre-loaded data)
        const similarObjectives =
          similaritiesByComparedToId.get(submodule.id) || [];

        // If no similar objectives found, add to ecartList
        if (similarObjectives.length === 0) {
          ecartList.push({
            module_id: module.id,
            nom_module: module.nomModule,
            submodule_id: submodule.id,
            nom_sousmodule: submodule.nomSousModule,
            description_sousmodule: null,
            Code_Objectif: submodule.codeObjectif,
            Code_Module: module.codeModule,
          });
        }

        // Process each similar objective
        for (const objective of similarObjectives) {
          if (
            !objective.sousModuleComparable ||
            !objective.sousModuleComparedTo
          )
            continue;
          if (!objective.sousModuleComparable.module) continue;

          const similarSubmodule = objective.sousModuleComparable;
          const similarModuleTn = objective.sousModuleComparable.module;
          const similarSubmoduleRefent = objective.sousModuleComparedTo;

          // Find the index of the module in modulesTn
          const moduleTnIndex = modulesTn.findIndex((m) =>
            m.startsWith(`${similarModuleTn.nomModule},`),
          );

          if (moduleTnIndex !== -1) {
            sousModulesByModuleTn[moduleTnIndex].push({
              Code_Objectif: similarSubmoduleRefent.codeObjectif,
              Code_Competence: similarSubmodule.codeObjectif,
              id: objective.id,
              Nom_Sous_Module_Referent: similarSubmoduleRefent.nomSousModule,
              Nom_Sous_Module_Similaire: similarSubmodule.nomSousModule,
              id_Similaire: similarSubmodule.id,
              ModuleTn: similarModuleTn.nomModule,
              CodeModuleTn: similarModuleTn.codeModule,
              Code_Module: module.codeModule,
            });

            // Add Code_Objectif to set if it exists
            if (similarSubmoduleRefent.codeObjectif) {
              codeObjectifsSet.add(similarSubmoduleRefent.codeObjectif);
            }
          }
        }
      }

      // Convert each sousModulesByModuleTn array to contain only unique Code_Objectif values
      const codeObjectifsByModuleTn = sousModulesByModuleTn.map(
        (objectivesArray) => {
          const codeObjectifsSet = new Set<string>();
          for (const obj of objectivesArray as Array<{
            Code_Objectif?: string;
          }>) {
            if (obj?.Code_Objectif) {
              codeObjectifsSet.add(obj.Code_Objectif);
            }
          }
          return Array.from(codeObjectifsSet);
        },
      );

      // Build the module entry with id at the beginning, including both FR and EN versions
      const moduleEntry = [
        module.id,
        `${module.nomModule || ''},${module.codeModule || '0'},${module.dureeEnHeures?.toString() || ''}`, // FR version
        `${module.nomModuleEn || ''},${module.codeModule || '0'},${module.dureeEnHeures?.toString() || ''}`, // EN version (no fallback to FR)
        ...codeObjectifsByModuleTn,
        Array.from(codeObjectifsSet), // Return only Code_Objectif values as array of strings
      ];

      modulesAl.push(moduleEntry);
    }

    return {
      status: 'success',
      code: '200',
      data: {
        comparaisonID: comparaison.id,
        id_Programme_Compare: comparaison.idProgrammeToCompare,
        Nom_Programme_Comapare:
          comparaison.programmeToCompare?.nomProgramme || null,
        Nom_Programme_Comapare_en:
          comparaison.programmeToCompare?.nomProgrammeEn || null,
        id_Programme_Comparable: comparaison.idProgrammeComparedTo,
        Nom_Programme_Comparable:
          comparaison.programmeComparedTo?.nomProgramme || null,
        Nom_Programme_Comparable_en:
          comparaison.programmeComparedTo?.nomProgrammeEn || null,
        TauxSimilarité: comparaison.tauxDeSimilarite?.toString() || null,
        modulesTn,
        modulesTn_en: modulesTnEn,
        modulesAl, // Contains both FR (index 1) and EN (index 2) versions in each entry
      },
    };
  }

  async getFlattenedModulesAlByComparaisonId(
    comparaisonId: number,
    page?: number,
    limit?: number,
  ) {
    if (!comparaisonId) {
      throw new ApiError(
        'comparaison_id is required',
        errors.BAD_REQUEST.code,
        errors.BAD_REQUEST.errorCode,
      );
    }

    // Get the comparison with programme relations
    const comparaison = await this.prisma.comparaison.findUnique({
      where: { id: comparaisonId },
      select: {
        id: true,
        idProgrammeToCompare: true,
        idProgrammeComparedTo: true,
      },
    });

    if (!comparaison) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode,
      );
    }

    // Fetch all data in parallel to avoid N+1 queries
    const [modulesTnList, modulesAlList, allSimilarities] = await Promise.all([
      // Get modules for programmeComparedTo (modulesTn)
      this.prisma.module.findMany({
        where: { idProgramme: comparaison.idProgrammeComparedTo },
        select: {
          nomModule: true,
          nomModuleEn: true,
        },
      }),
      // Get modules for programmeToCompare (modulesAl) with sous-modules
      this.prisma.module.findMany({
        where: { idProgramme: comparaison.idProgrammeToCompare },
        select: {
          id: true,
          nomModule: true,
          codeModule: true,
          sousModules: {
            select: {
              id: true,
              nomSousModule: true,
              nomSousModuleEn: true,
              codeObjectif: true,
            },
          },
        },
      }),
      // Get all similarities for this comparaison with related sous-modules and modules
      this.prisma.sousModuleSimilarite.findMany({
        where: { comparaisonId },
        select: {
          id: true,
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
      }),
    ]);

    // Format modulesTn as strings for matching
    const modulesTn = modulesTnList.map(
      (module) => `${module.nomModule || ''},`,
    );

    // Create a map of similarities by comparedTo sous-module ID
    const similaritiesByComparedToId = new Map<
      number,
      typeof allSimilarities
    >();
    allSimilarities.forEach((sim) => {
      if (sim.idSousModuleComparedTo) {
        if (!similaritiesByComparedToId.has(sim.idSousModuleComparedTo)) {
          similaritiesByComparedToId.set(sim.idSousModuleComparedTo, []);
        }
        similaritiesByComparedToId.get(sim.idSousModuleComparedTo)!.push(sim);
      }
    });

    // Collect all items from modulesAl
    const allItems: Array<{
      Code_Objectif: string | null;
      Code_Competence: string | null;
      id: number;
      Nom_Sous_Module_Referent: string | null;
      Nom_Sous_Module_Referent_en: string | null;
      Nom_Sous_Module_Similaire: string | null;
      Nom_Sous_Module_Similaire_en: string | null;
      id_Similaire: number | null;
      ModuleTn: string | null;
      ModuleTn_en: string | null;
      CodeModuleTn: string | null;
      Code_Module: string | null;
    }> = [];

    // Process each module in modulesAlList
    for (const module of modulesAlList) {
      // Get sous-modules for this module (already loaded)
      const sousModules = module.sousModules;

      // Process each sous-module
      for (const submodule of sousModules) {
        // Find similar objectives for this sous-module (from pre-loaded data)
        const similarObjectives =
          similaritiesByComparedToId.get(submodule.id) || [];

        // Process each similar objective
        for (const objective of similarObjectives) {
          if (
            !objective.sousModuleComparable ||
            !objective.sousModuleComparedTo
          )
            continue;
          if (!objective.sousModuleComparable.module) continue;

          const similarSubmodule = objective.sousModuleComparable;
          const similarModuleTn = objective.sousModuleComparable.module;
          const similarSubmoduleRefent = objective.sousModuleComparedTo;

          // Find the index of the module in modulesTn
          const moduleTnIndex = modulesTn.findIndex((m) =>
            m.startsWith(`${similarModuleTn.nomModule},`),
          );

          if (moduleTnIndex !== -1) {
            allItems.push({
              Code_Objectif: similarSubmoduleRefent.codeObjectif,
              Code_Competence: similarSubmodule.codeObjectif,
              id: objective.id,
              Nom_Sous_Module_Referent: similarSubmoduleRefent.nomSousModule,
              Nom_Sous_Module_Referent_en:
                similarSubmoduleRefent.nomSousModuleEn ?? null,
              Nom_Sous_Module_Similaire: similarSubmodule.nomSousModule,
              Nom_Sous_Module_Similaire_en:
                similarSubmodule.nomSousModuleEn ?? null,
              id_Similaire: similarSubmodule.id,
              ModuleTn: similarModuleTn.nomModule,
              ModuleTn_en: similarModuleTn.nomModuleEn ?? null,
              CodeModuleTn: similarModuleTn.codeModule,
              Code_Module: module.codeModule,
            });
          }
        }
      }
    }

    // Group items by Nom_Sous_Module_Referent
    const groupedByReferent = new Map<string, typeof allItems>();

    allItems.forEach((item) => {
      const referentKey = item.Nom_Sous_Module_Referent || '';
      if (!groupedByReferent.has(referentKey)) {
        groupedByReferent.set(referentKey, []);
      }
      groupedByReferent.get(referentKey)?.push(item);
    });

    // Convert to array of objects grouped by Nom_Sous_Module_Referent
    // Each object has Nom_Sous_Module_Referent, Nom_Sous_Module_Referent_en and items (items omit referent fields)
    const groupedData = Array.from(groupedByReferent.entries()).map(
      ([referent, items]) => {
        const firstItem = items[0];
        const referentEn =
          firstItem && 'Nom_Sous_Module_Referent_en' in firstItem
            ? firstItem.Nom_Sous_Module_Referent_en
            : null;
        // Remove Nom_Sous_Module_Referent and Nom_Sous_Module_Referent_en from each item (now on parent)
        const itemsWithoutReferent = items.map((item) => {
          const {
            Nom_Sous_Module_Referent: _unusedRef,
            Nom_Sous_Module_Referent_en: _unusedRefEn,
            ...rest
          } = item;
          void _unusedRef;
          void _unusedRefEn;
          return rest;
        });

        return {
          Nom_Sous_Module_Referent: referent,
          Nom_Sous_Module_Referent_en: referentEn,
          items: itemsWithoutReferent,
        };
      },
    );

    // Apply pagination
    const pageNum = page || 1;
    const limitNum = limit || 10;
    const skip = (pageNum - 1) * limitNum;
    const total = groupedData.length;
    const paginatedData = groupedData.slice(skip, skip + limitNum);

    return {
      status: 'success',
      code: '200',
      data: paginatedData,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        limitPerPage: limitNum,
        totalCount: total,
      },
    };
  }

  async getModuleByIdWithDetails(
    moduleId: number,
    comparaisonId: number,
    page?: number,
    limit?: number,
  ) {
    if (!moduleId) {
      throw new ApiError(
        'module_id is required',
        errors.BAD_REQUEST.code,
        errors.BAD_REQUEST.errorCode,
      );
    }

    if (!comparaisonId) {
      throw new ApiError(
        'comparaison_id is required',
        errors.BAD_REQUEST.code,
        errors.BAD_REQUEST.errorCode,
      );
    }

    const pageNum = page || 1;
    const limitNum = limit || 5;
    const skip = (pageNum - 1) * limitNum;

    // Verify comparaison exists
    const comparaison = await this.prisma.comparaison.findUnique({
      where: { id: comparaisonId },
      select: {
        id: true,
        idProgrammeToCompare: true,
        idProgrammeComparedTo: true,
      },
    });

    if (!comparaison) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode,
      );
    }

    // Get the specific module
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      select: {
        id: true,
        nomModule: true,
        nomModuleEn: true,
        dureeEnHeures: true,
        codeModule: true,
        idProgramme: true,
      },
    });

    if (!module) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode,
      );
    }

    // Verify module belongs to the comparaison's programme
    if (module.idProgramme !== comparaison.idProgrammeToCompare) {
      throw new ApiError(
        'Module does not belong to the specified comparaison',
        errors.BAD_REQUEST.code,
        errors.BAD_REQUEST.errorCode,
      );
    }

    // Fetch sous-modules for this module and all similarities for the comparaison
    const [sousModules, allSimilarities] = await Promise.all([
      this.prisma.sousModule.findMany({
        where: { idModule: module.id },
        select: {
          id: true,
          nomSousModule: true,
          nomSousModuleEn: true,
          codeObjectif: true,
        },
      }),
      this.prisma.sousModuleSimilarite.findMany({
        where: { comparaisonId },
        select: {
          id: true,
          idSousModuleComparable: true,
          idSousModuleComparedTo: true,
          sousModuleComparable: {
            select: {
              id: true,
              nomSousModule: true,
              nomSousModuleEn: true,
              codeObjectif: true,
              module: {
                select: {
                  id: true,
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
      }),
    ]);

    // Create a map of similarities by comparedTo sous-module ID
    const similaritiesByComparedToId = new Map<
      number,
      typeof allSimilarities
    >();
    allSimilarities.forEach((sim) => {
      if (sim.idSousModuleComparedTo) {
        if (!similaritiesByComparedToId.has(sim.idSousModuleComparedTo)) {
          similaritiesByComparedToId.set(sim.idSousModuleComparedTo, []);
        }
        similaritiesByComparedToId.get(sim.idSousModuleComparedTo)!.push(sim);
      }
    });

    // Collect all objectives for pagination
    const allObjectives: {
      id: number;
      Code_Module: string | null;
      Code_Objectif: string | null;
      Nom_Sous_Module_Referent: string | null;
      Nom_Sous_Module_Referent_en: string | null;
      Nom_Sous_Module_Similaire: string | null;
      Nom_Sous_Module_Similaire_en: string | null;
      id_Similaire: number | null;
      Code_Module_Tn: string | null;
      Code_Competence: string | null;
    }[] = [];

    // Process each sous-module
    for (const submodule of sousModules) {
      // Find similar objectives for this sous-module (from pre-loaded data)
      const similarObjectives =
        similaritiesByComparedToId.get(submodule.id) || [];

      // Process each similar objective
      for (const objective of similarObjectives) {
        if (!objective.sousModuleComparable || !objective.sousModuleComparedTo)
          continue;

        const similarSubmodule = objective.sousModuleComparable;
        const similarSubmoduleRefent = objective.sousModuleComparedTo;

        const objectiveData = {
          id: objective.id,
          Code_Module: module.codeModule || null,
          Code_Objectif: similarSubmoduleRefent.codeObjectif,
          Nom_Sous_Module_Referent: similarSubmoduleRefent.nomSousModule,
          Nom_Sous_Module_Referent_en: similarSubmoduleRefent.nomSousModuleEn,
          Nom_Sous_Module_Similaire: similarSubmodule.nomSousModule,
          Nom_Sous_Module_Similaire_en: similarSubmodule.nomSousModuleEn,
          id_Similaire: similarSubmodule.id,
          Code_Module_Tn: similarSubmodule.module?.codeModule || null,
          Code_Competence: similarSubmodule.codeObjectif || null,
        };

        allObjectives.push(objectiveData);
      }
    }

    // Apply pagination to objectives (backend returns only the slice for the requested page)
    const total = allObjectives.length;
    const paginatedObjectives = allObjectives.slice(skip, skip + limitNum);

    // Build the module entry:
    // - first element: module metadata (FR/EN names + code + hours + id)
    // - second element: the current page of objectives
    const moduleEntry = [
      {
        moduleId: module.id,
        module: `${module.nomModule || ''},${module.codeModule || '0'},${module.dureeEnHeures?.toString() || ''}`,
        module_en: `${module.nomModuleEn || ''},${module.codeModule || '0'},${module.dureeEnHeures?.toString() || ''}`,
      },
      paginatedObjectives,
    ];

    return {
      status: 'success',
      code: '200',
      data: {
        moduleId: module.id,
        comparaisonID: comparaison.id,
        data: moduleEntry,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          limitPerPage: limitNum,
          totalCount: total,
        },
      },
    };
  }

  async exportComparaisonsToCSV(
    lang: 'fr' | 'en' = 'fr',
    minSimilarity = 0,
    maxSimilarity = 100,
  ): Promise<Buffer> {
    const useEnglish = lang === 'en';

    const minRate = minSimilarity / 100;
    const maxRate = maxSimilarity / 100;

    const LABELS = {
      fr: {
        REF: 'Référence',
        COMPARABLE: 'Programme comparable',
        COMPARED: 'Programme comparé',
        RATE: 'Taux de similarité',
        DATE: 'Date de comparaison',
      },
      en: {
        REF: 'Reference',
        COMPARABLE: 'Comparable Program',
        COMPARED: 'Compared Program',
        RATE: 'Similarity Rate',
        DATE: 'Comparison Date',
      },
    } as const;

    const L = LABELS[lang];
    const formatSimilarityRate = (value: unknown): string => {
      if (value === null || value === undefined) return '0%';

      const num = Number(value);

      if (Number.isNaN(num)) return '0%';

      // valeur déjà normalisée (0 → 1)
      if (num <= 1) {
        return `${(num * 100).toFixed(2)}%`;
      }

      // valeur déjà en pourcentage (sécurité)
      return `${num.toFixed(2)}%`;
    };

    const rows = await this.prisma.comparaison.findMany({
      where: {
        tauxDeSimilarite: {
          gte: minRate,
          lte: maxRate,
        },
      },
      select: {
        id: true,
        tauxDeSimilarite: true,
        createdAt: true,
        programmeToCompare: {
          select: {
            nomProgramme: true,
            nomProgrammeEn: true,
          },
        },
        programmeComparedTo: {
          select: {
            nomProgramme: true,
            nomProgrammeEn: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = rows.map((item) => ({
      [L.REF]: item.id,
      [L.COMPARABLE]: useEnglish
        ? (item.programmeComparedTo?.nomProgrammeEn ?? '')
        : (item.programmeComparedTo?.nomProgramme ?? ''),
      [L.COMPARED]: useEnglish
        ? (item.programmeToCompare?.nomProgrammeEn ?? '')
        : (item.programmeToCompare?.nomProgramme ?? ''),
      [L.RATE]: formatSimilarityRate(item.tauxDeSimilarite),

      [L.DATE]: item.createdAt.toISOString().split('T')[0],
    }));

    const csv = stringify(data, {
      header: true,
      delimiter: ';', // Excel FR
    });

    // ✅ BOM UTF-8 (Excel)
    const bom = Buffer.from('\uFEFF', 'utf-8');
    return Buffer.concat([bom, Buffer.from(csv, 'utf-8')]);
  }

  async getAllClassificationList(comparaisonId: number) {
    if (!comparaisonId) {
      throw new ApiError(
        'comparaison_id is required',
        errors.BAD_REQUEST.code,
        errors.BAD_REQUEST.errorCode,
      );
    }
    ///////////decomment this once the db is clean
    // // Verify comparaison exists
    // const comparaison = await this.prisma.comparaison.findUnique({
    //   where: { id: comparaisonId },
    //   select: { id: true },
    // });

    // if (!comparaison) {
    //   throw new ApiError(
    //     errors.NOT_FOUND.message,
    //     errors.NOT_FOUND.code,
    //     errors.NOT_FOUND.errorCode,
    //   );
    // }
    // Get comparaison to find the programme
    const comparaison = await this.prisma.comparaison.findUnique({
      where: { id: comparaisonId },
      select: {
        id: true,
        idProgrammeToCompare: true,
      },
    });

    if (!comparaison || !comparaison.idProgrammeToCompare) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode,
      );
    }

    // Fetch all classifications
    const taskClassificationList =
      await this.prisma.taskClassification.findMany({
        where: { comparaisonId },
        select: {
          id: true,
          taskClass: true,
          taskDescription: true,
          taskDescriptionEn: true,
          taskModule: true,
          taskModuleEn: true,
        },
      });

    // Get all modules for the programme to match with taskModule
    const modules = await this.prisma.module.findMany({
      where: { idProgramme: comparaison.idProgrammeToCompare },
      select: {
        id: true,
        nomModule: true,
        codeModule: true,
      },
    });

    // Get all sous-modules for these modules to match with taskDescription
    const moduleIds = modules.map((m) => m.id);
    const sousModules = await this.prisma.sousModule.findMany({
      where: { idModule: { in: moduleIds } },
      select: {
        id: true,
        idModule: true,
        nomSousModule: true,
        codeObjectif: true,
      },
    });

    // Create lookup maps for faster access
    const moduleMap = new Map<string, { codeModule: string | null }>();
    modules.forEach((m) => {
      if (m.nomModule) {
        moduleMap.set(m.nomModule, { codeModule: m.codeModule });
      }
    });

    const sousModuleMap = new Map<string, { codeObjectif: string | null }>();
    sousModules.forEach((sm) => {
      if (sm.nomSousModule) {
        sousModuleMap.set(sm.nomSousModule, { codeObjectif: sm.codeObjectif });
      }
    });

    // Initialize grouped structure
    const classificationData: Record<
      string,
      Array<{
        module: string | null;
        module_en: string | null;
        task_id?: number;
        ecart: string | null;
        ecart_en: string | null;
        code_module: string | null;
        code_objectif: string | null;
      }>
    > = {
      'soft skills': [],
      'technical skills': [],
      'green skills': [],
      'language skills': [],
      unrecognized: [],
    };

    // Loop through items and group by class
    taskClassificationList.forEach((item) => {
      const {
        id,
        taskClass,
        taskDescription,
        taskDescriptionEn,
        taskModule,
        taskModuleEn,
      } = item;

      // Look up code_module and code_objectif
      const moduleInfo = taskModule ? moduleMap.get(taskModule) : null;
      const sousModuleInfo = taskDescription
        ? sousModuleMap.get(taskDescription)
        : null;

      const classificationItem = {
        module: taskModule,
        module_en: taskModuleEn || null,
        task_id: id,
        ecart: taskDescription,
        ecart_en: taskDescriptionEn || null,
        code_module: moduleInfo?.codeModule || null,
        code_objectif: sousModuleInfo?.codeObjectif || null,
      };

      const taskClassLower = taskClass?.toLowerCase();
      if (
        taskClassLower &&
        Object.prototype.hasOwnProperty.call(classificationData, taskClassLower)
      ) {
        classificationData[taskClassLower].push(classificationItem);
      } else {
        // Remove task_id for unrecognized items (as per original code)
        const { task_id, ...unrecognizedItem } = classificationItem;
        // task_id is intentionally omitted for unrecognized items
        void task_id; // Explicitly mark as intentionally unused
        classificationData.unrecognized.push(unrecognizedItem);
      }
    });

    return {
      status: 'success',
      code: '200',
      data: classificationData,
    };
  }

  async exportComparaisonCsvById(
    comparaisonId: number,
    lang: 'fr' | 'en' = 'fr',
  ): Promise<Buffer> {
    if (!comparaisonId) {
      throw new ApiError(
        'comparaison_id is required',
        errors.BAD_REQUEST.code,
        errors.BAD_REQUEST.errorCode,
      );
    }

    const langLower = lang.toLowerCase();

    const moduleData = await this.getAllModulesByComparaisonId(comparaisonId);

    const modulesTn =
      langLower === 'en'
        ? moduleData.data.modulesTn_en || []
        : moduleData.data.modulesTn || [];

    const modulesAl = moduleData.data.modulesAl || [];
    const { TauxSimilarité } = moduleData.data;

    /* ---------------- CSV HELPERS ---------------- */

    const escapeCSV = (value: unknown): string => {
      if (value === null || value === undefined) return '';
      const v = String(value);
      return v.includes(',') || v.includes('"') || v.includes('\n')
        ? `"${v.replace(/"/g, '""')}"`
        : v;
    };

    const formatSimilarityRate = (value: unknown): string => {
      const num = Number(value);
      if (Number.isNaN(num)) return '';
      return num <= 1 ? `${(num * 100).toFixed(2)} %` : `${num.toFixed(2)} %`;
    };

    /* ---------------- BUILD CSV ---------------- */

    const moduleHeaders: string[] = [];

    modulesTn.forEach((m: string) => {
      const name = m.split(',')[0] ?? '';
      moduleHeaders.push(
        name
          .replace(/,?\d/g, '')
          .replace(/heures/gi, '')
          .trim(),
      );
    });

    const csvRows: string[] = [];

    const firstRow = [
      '',
      langLower === 'en' ? 'Modules Number' : 'Nombre de modules',
      langLower === 'en' ? 'Hours' : 'Heures',
      ...modulesTn.map((m: string) =>
        (m.split(',').pop() ?? '').replace(/heures/gi, '').trim(),
      ),
    ];

    csvRows.push(firstRow.map(escapeCSV).join(','));

    modulesAl.forEach((entry: unknown[]) => {
      const moduleInfo =
        langLower === 'en' ? (entry[2] as string) : (entry[1] as string);

      const parts = moduleInfo.split(',');
      const hours = parts.pop()?.trim() ?? '';
      const code = parts.pop()?.trim() ?? '';
      const name = parts.join(',').trim();

      const objectives = entry.slice(3, -1) as unknown[][];

      const row = [name, code, hours];

      objectives.forEach((objs) => {
        const codes = Array.from(
          new Set(
            objs
              .map((o) => {
                if (typeof o === 'string') {
                  return o;
                }

                if (
                  typeof o === 'object' &&
                  o !== null &&
                  'Code_Objectif' in o
                ) {
                  const obj = o as Record<string, unknown>;
                  return typeof obj.Code_Objectif === 'string'
                    ? obj.Code_Objectif
                    : null;
                }

                return null;
              })
              .filter((v): v is string => Boolean(v)),
          ),
        );

        row.push(codes.join(' | '));
      });

      csvRows.push(row.map(escapeCSV).join(','));
    });

    csvRows.push(
      [
        '',
        langLower === 'en' ? 'Similarity Rate' : 'Taux de similarité',
        formatSimilarityRate(TauxSimilarité),
        ...Array(moduleHeaders.length).fill(''),
      ]
        .map(escapeCSV)
        .join(','),
    );

    const headerRow = ['', '', '', ...moduleHeaders.map(escapeCSV)];

    const csvContent = [headerRow.join(','), ...csvRows].join('\n');

    /* ✅ RETOUR BUFFER (COMME TOUS LES AUTRES EXPORTS) */
    const bom = Buffer.from('\uFEFF', 'utf-8');
    return Buffer.concat([bom, Buffer.from(csvContent, 'utf-8')]);
  }

  async getPreComparaison(programmeId: number) {
    if (!programmeId) {
      throw new ApiError(
        'programme_id is required',
        errors.BAD_REQUEST.code,
        errors.BAD_REQUEST.errorCode,
      );
    }

    const backUrl = this.configService.get<string>('BACK_URL_COMPARAISON');
    const apiKey = this.configService.get<string>('API_KEY');

    if (!backUrl) {
      throw new ApiError(
        'BACK_URL_COMPARAISON is not configured in environment variables',
        errors.BAD_REQUEST.code,
        errors.BAD_REQUEST.errorCode,
      );
    }

    if (!apiKey) {
      throw new ApiError(
        'API_KEY is not configured in environment variables',
        errors.BAD_REQUEST.code,
        errors.BAD_REQUEST.errorCode,
      );
    }

    // Get the programme from database to get its name
    const programme = await this.prisma.programme.findUnique({
      where: { id: programmeId },
      select: {
        id: true,
        nomProgramme: true,
      },
    });

    if (!programme) {
      throw new ApiError(
        `Programme with ID ${programmeId} not found`,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode,
      );
    }

    // Ensure the URL ends with a slash and append the endpoint
    const baseUrl = backUrl.endsWith('/') ? backUrl : `${backUrl}/`;
    const apiUrl = `${baseUrl}pre-comparaison`;

    const requestBody = {
      programName: programme.nomProgramme || '',
      model: 'camembert',
      searchIN: 'Tunisien',
      n: 13,
    };

    try {
      // Call the Python API
      const response: Response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          API_KEY: apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Python API error: ${response.status}`;

        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.detail) {
            errorMessage += ` - ${errorJson.detail}`;
          } else if (errorJson.msg) {
            errorMessage += ` - ${errorJson.msg}`;
          } else {
            errorMessage += ` - ${errorText}`;
          }
        } catch {
          errorMessage += ` - ${errorText}`;
        }

        throw new ApiError(
          errorMessage,
          errors.BAD_REQUEST.code,
          errors.BAD_REQUEST.errorCode,
        );
      }

      const data = (await response.json()) as Record<string, unknown>;

      return {
        status: 'success',
        code: '200',
        data: data,
      };
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Failed to call Python API: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errors.BAD_REQUEST.code,
        errors.BAD_REQUEST.errorCode,
      );
    }
  }

  async ecartsClassification(body: Record<string, unknown>) {
    const backUrl = this.configService.get<string>('BACK_URL_COMPARAISON');
    const apiKey = this.configService.get<string>('API_KEY');

    if (!backUrl) {
      throw new ApiError(
        'BACK_URL_COMPARAISON is not configured in environment variables',
        errors.BAD_REQUEST.code,
        errors.BAD_REQUEST.errorCode,
      );
    }

    if (!apiKey) {
      throw new ApiError(
        'API_KEY is not configured in environment variables',
        errors.BAD_REQUEST.code,
        errors.BAD_REQUEST.errorCode,
      );
    }

    // Enrich body with code_module and code_objectif
    const enrichedBody = { ...body };

    // Check if body has tasks array
    if (enrichedBody.tasks && Array.isArray(enrichedBody.tasks)) {
      const comparaisonId =
        typeof enrichedBody.comparaison_id === 'number'
          ? enrichedBody.comparaison_id
          : null;

      if (comparaisonId) {
        // Get comparaison to find the programme
        const comparaison = await this.prisma.comparaison.findUnique({
          where: { id: comparaisonId },
          select: {
            id: true,
            idProgrammeToCompare: true,
          },
        });

        if (comparaison && comparaison.idProgrammeToCompare) {
          // Get all modules for the programme
          const modules = await this.prisma.module.findMany({
            where: { idProgramme: comparaison.idProgrammeToCompare },
            select: {
              id: true,
              nomModule: true,
              codeModule: true,
            },
          });

          // Get all sous-modules for these modules
          const moduleIds = modules.map((m) => m.id);
          const sousModules = await this.prisma.sousModule.findMany({
            where: { idModule: { in: moduleIds } },
            select: {
              id: true,
              idModule: true,
              nomSousModule: true,
              codeObjectif: true,
            },
          });

          // Create lookup maps
          const moduleMap = new Map<string, string | null>();
          modules.forEach((m) => {
            if (m.nomModule) {
              moduleMap.set(m.nomModule, m.codeModule);
            }
          });

          const sousModuleMap = new Map<string, string | null>();
          sousModules.forEach((sm) => {
            if (sm.nomSousModule) {
              sousModuleMap.set(sm.nomSousModule, sm.codeObjectif);
            }
          });

          // Enrich each task with code_module and code_objectif
          enrichedBody.tasks = (
            enrichedBody.tasks as Array<Record<string, unknown>>
          ).map((task) => {
            const moduleName =
              typeof task.module === 'string' ? task.module : null;
            const ecartName =
              typeof task.ecart === 'string' ? task.ecart : null;

            const codeModule = moduleName
              ? moduleMap.get(moduleName) || null
              : null;
            const codeObjectif = ecartName
              ? sousModuleMap.get(ecartName) || null
              : null;

            return {
              ...task,
              code_module: codeModule,
              code_objectif: codeObjectif,
            };
          });
        }
      }
    }

    // Ensure the URL ends with a slash and append the endpoint
    const baseUrl = backUrl.endsWith('/') ? backUrl : `${backUrl}/`;
    const apiUrl = `${baseUrl}classification`;
    try {
      // Call the Python API
      const response: Response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          API_KEY: apiKey,
        },
        body: JSON.stringify(enrichedBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Python API error: ${response.status}`;

        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.detail) {
            errorMessage += ` - ${errorJson.detail}`;
          } else if (errorJson.msg) {
            errorMessage += ` - ${errorJson.msg}`;
          } else {
            errorMessage += ` - ${errorText}`;
          }
        } catch {
          errorMessage += ` - ${errorText}`;
        }

        throw new ApiError(
          errorMessage,
          errors.BAD_REQUEST.code,
          errors.BAD_REQUEST.errorCode,
        );
      }

      const data = (await response.json()) as Record<string, unknown>;

      return {
        status: 'success',
        code: '200',
        data: data,
      };
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Failed to call Python API: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errors.BAD_REQUEST.code,
        errors.BAD_REQUEST.errorCode,
      );
    }
  }

  async ecartsClassificationUpdate(body: Record<string, unknown>) {
    const backUrl = this.configService.get<string>('BACK_URL_COMPARAISON');
    const apiKey = this.configService.get<string>('API_KEY');

    if (!backUrl) {
      throw new ApiError(
        'BACK_URL_COMPARAISON is not configured in environment variables',
        errors.BAD_REQUEST.code,
        errors.BAD_REQUEST.errorCode,
      );
    }

    if (!apiKey) {
      throw new ApiError(
        'API_KEY is not configured in environment variables',
        errors.BAD_REQUEST.code,
        errors.BAD_REQUEST.errorCode,
      );
    }

    // Ensure the URL ends with a slash and append the endpoint
    const baseUrl = backUrl.endsWith('/') ? backUrl : `${backUrl}/`;
    const apiUrl = `${baseUrl}update-classification`;

    try {
      // Call the Python API
      const response: Response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          API_KEY: apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Python API error: ${response.status}`;

        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.detail) {
            // Handle array of detail objects (common in FastAPI validation errors)
            if (Array.isArray(errorJson.detail)) {
              const detailMessages = errorJson.detail.map((d: unknown) => {
                if (typeof d === 'object' && d !== null) {
                  const detail = d as Record<string, unknown>;
                  const loc = detail.loc;
                  const locPath = Array.isArray(loc) ? loc.join('.') : 'field';
                  return `${locPath}: ${detail.msg || JSON.stringify(d)}`;
                }
                return String(d);
              });
              errorMessage += ` - ${detailMessages.join(', ')}`;
            } else if (typeof errorJson.detail === 'string') {
              errorMessage += ` - ${errorJson.detail}`;
            } else {
              errorMessage += ` - ${JSON.stringify(errorJson.detail)}`;
            }
          } else if (errorJson.msg) {
            errorMessage += ` - ${errorJson.msg}`;
          } else {
            errorMessage += ` - ${errorText}`;
          }
        } catch {
          errorMessage += ` - ${errorText}`;
        }

        throw new ApiError(
          errorMessage,
          errors.BAD_REQUEST.code,
          errors.BAD_REQUEST.errorCode,
        );
      }

      const data = (await response.json()) as Record<string, unknown>;

      // Extract comparaison_id from the request body
      const comparaisonId = body.comparaison_id as number;
      if (!comparaisonId) {
        throw new ApiError(
          'comparaison_id is required in request body',
          errors.BAD_REQUEST.code,
          errors.BAD_REQUEST.errorCode,
        );
      }

      // Parse the categorized_tasks from Python API response
      const categorizedTasks = data as Record<
        string,
        Array<{
          module?: string | null;
          module_en?: string | null;
          ecart?: string | null;
          ecart_en?: string | null;
          task_id?: number;
          code_module?: string | null;
          code_objectif?: string | null;
        }>
      >;

      // Delete existing classifications for this comparaison
      await this.prisma.taskClassification.deleteMany({
        where: { comparaisonId },
      });

      // Prepare new classifications to insert
      const classificationsToInsert: Array<{
        comparaisonId: number;
        taskClass: string;
        taskModule: string | null;
        taskModuleEn: string | null;
        taskDescription: string | null;
        taskDescriptionEn: string | null;
      }> = [];

      // Process each category
      for (const [taskClass, tasks] of Object.entries(categorizedTasks)) {
        if (Array.isArray(tasks)) {
          for (const task of tasks) {
            classificationsToInsert.push({
              comparaisonId,
              taskClass,
              taskModule: task.module || null,
              taskModuleEn: task.module_en || null,
              taskDescription: task.ecart || null,
              taskDescriptionEn: task.ecart_en || null,
            });
          }
        }
      }

      // Insert new classifications in batch
      if (classificationsToInsert.length > 0) {
        await this.prisma.taskClassification.createMany({
          data: classificationsToInsert,
        });
      }

      return {
        status: 'success',
        code: '200',
        data: data,
      };
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Failed to call Python API: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errors.BAD_REQUEST.code,
        errors.BAD_REQUEST.errorCode,
      );
    }
  }

  async removeSimilarity(body: Record<string, unknown>) {
    const backUrl = this.configService.get<string>('BACK_URL_COMPARAISON');
    const apiKey = this.configService.get<string>('API_KEY');

    if (!backUrl) {
      throw new ApiError(
        'BACK_URL_COMPARAISON is not configured in environment variables',
        errors.BAD_REQUEST.code,
        errors.BAD_REQUEST.errorCode,
      );
    }

    if (!apiKey) {
      throw new ApiError(
        'API_KEY is not configured in environment variables',
        errors.BAD_REQUEST.code,
        errors.BAD_REQUEST.errorCode,
      );
    }

    // Ensure the URL ends with a slash and append the endpoint
    const baseUrl = backUrl.endsWith('/') ? backUrl : `${backUrl}/`;
    const apiUrl = `${baseUrl}remove-similarity`;

    try {
      // Call the Python API
      const response: Response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          API_KEY: apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Python API error: ${response.status}`;

        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.detail) {
            errorMessage += ` - ${errorJson.detail}`;
          } else if (errorJson.msg) {
            errorMessage += ` - ${errorJson.msg}`;
          } else {
            errorMessage += ` - ${errorText}`;
          }
        } catch {
          errorMessage += ` - ${errorText}`;
        }

        throw new ApiError(
          errorMessage,
          errors.BAD_REQUEST.code,
          errors.BAD_REQUEST.errorCode,
        );
      }

      const data = (await response.json()) as Record<string, unknown>;

      return {
        status: 'success',
        code: '200',
        data: data,
      };
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Failed to call Python API: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errors.BAD_REQUEST.code,
        errors.BAD_REQUEST.errorCode,
      );
    }
  }

  async addSimilarity(body: Record<string, unknown>) {
    const comparaisonId = body?.comparaison_id as number | undefined;
    const idSousModuleComparedTo = body?.id_SousModule_ComparedTo as
      | number
      | undefined;
    const idSousModuleComparable = body?.id_SousModule_Comparable as
      | number
      | undefined;

    if (!comparaisonId || !idSousModuleComparedTo || !idSousModuleComparable) {
      throw new ApiError(
        'comparaison_id, id_SousModule_ComparedTo and id_SousModule_Comparable are required',
        errors.BAD_REQUEST.code,
        errors.BAD_REQUEST.errorCode,
      );
    }

    // Ensure comparaison exists (keep early validation)
    const comparaison = await this.prisma.comparaison.findUnique({
      where: { id: comparaisonId },
      select: { id: true },
    });

    if (!comparaison) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode,
      );
    }

    const backUrl = this.configService.get<string>('BACK_URL_COMPARAISON');
    const apiKey = this.configService.get<string>('API_KEY');

    if (!backUrl) {
      throw new ApiError(
        'BACK_URL_COMPARAISON is not configured in environment variables',
        errors.BAD_REQUEST.code,
        errors.BAD_REQUEST.errorCode,
      );
    }

    if (!apiKey) {
      throw new ApiError(
        'API_KEY is not configured in environment variables',
        errors.BAD_REQUEST.code,
        errors.BAD_REQUEST.errorCode,
      );
    }

    // Default language to FR if not provided
    const lang =
      typeof body?.lang === 'string' && body.lang.trim() !== ''
        ? String(body.lang).trim().toLowerCase()
        : 'fr';
    const validLang = lang === 'en' ? 'en' : 'fr';

    // Ensure the URL ends with a slash and append the endpoint
    const baseUrl = backUrl.endsWith('/') ? backUrl : `${backUrl}/`;
    const apiUrl = `${baseUrl}add-similarity?lang=${validLang}`;

    try {
      // Call the Python API (source of truth for creating similarities)
      const response: Response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          API_KEY: apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Python API error: ${response.status}`;

        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.detail) {
            errorMessage += ` - ${errorJson.detail}`;
          } else if (errorJson.msg) {
            errorMessage += ` - ${errorJson.msg}`;
          } else {
            errorMessage += ` - ${errorText}`;
          }
        } catch {
          errorMessage += ` - ${errorText}`;
        }

        throw new ApiError(
          errorMessage,
          errors.BAD_REQUEST.code,
          errors.BAD_REQUEST.errorCode,
        );
      }

      const data = (await response.json()) as Record<string, unknown>;

      return {
        status: 'success',
        code: '200',
        data,
      };
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Failed to call Python API: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errors.BAD_REQUEST.code,
        errors.BAD_REQUEST.errorCode,
      );
    }
  }

  async getAllProgrammeModules(
    programmeId: number,
    page?: number,
    limit?: number,
  ) {
    if (!programmeId) {
      throw new ApiError(
        'programme_id is required',
        errors.BAD_REQUEST.code,
        errors.BAD_REQUEST.errorCode,
      );
    }

    const pageNum = page || 1;
    const limitNum = limit || 10;
    const skip = (pageNum - 1) * limitNum;

    // Get programme with modules and sous-modules
    // IMPORTANT: select only needed fields on modules to avoid loading dureeEnHeures,
    // which can contain non-integer values like "30 heures" and trigger Prisma P2023.
    const programme = await this.prisma.programme.findUnique({
      where: { id: programmeId },
      select: {
        id: true,
        modules: {
          select: {
            id: true,
            codeModule: true,
            sousModules: {
              select: {
                id: true,
                nomSousModule: true,
                nomSousModuleEn: true,
                codeObjectif: true,
              },
            },
          },
        },
      },
    });

    if (!programme) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode,
      );
    }

    // Extract and flatten all sous-modules from all modules (include codeModule + codeObjectif for select label)
    const allSousModules = programme.modules
      .reduce<
        Array<{
          id: number;
          nomSousModule: string | null;
          nomSousModuleEn: string | null;
          codeModule: string | null;
          codeObjectif: string | null;
        }>
      >((acc, module) => {
        const codeModule = module.codeModule ?? null;
        for (const sousModule of module.sousModules) {
          acc.push({
            id: sousModule.id,
            nomSousModule: sousModule.nomSousModule,
            nomSousModuleEn: sousModule.nomSousModuleEn,
            codeModule,
            codeObjectif: sousModule.codeObjectif ?? null,
          });
        }
        return acc;
      }, [])
      .map((sousModule) => ({
        id: sousModule.id,
        name: sousModule.nomSousModule,
        nameEn: sousModule.nomSousModuleEn,
        codeModule: sousModule.codeModule,
        codeObjectif: sousModule.codeObjectif,
      }));

    // Apply pagination
    const total = allSousModules.length;
    const paginatedSousModules = allSousModules.slice(skip, skip + limitNum);

    return {
      status: 'success',
      code: '200',
      data: paginatedSousModules,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        limitPerPage: limitNum,
        totalCount: total,
      },
    };
  }
}
