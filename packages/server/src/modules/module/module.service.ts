import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApiError } from '../../common/errors/api-error';
import { errors } from '../../common/errors/errors';

@Injectable()
export class ModuleService {
  constructor(private prisma: PrismaService) {}

  async getModuleById(comparaisonId: number) {
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
          },
        },
        programmeComparedTo: {
          select: {
            nomProgramme: true,
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

    // Get modules for programmeComparedTo (modulesTn)
    const modulesTnList = await this.prisma.module.findMany({
      where: { idProgramme: comparaison.idProgrammeComparedTo },
      select: {
        nomModule: true,
        dureeEnHeures: true,
        nomModuleEn: true,
      },
    });

    // Get modules for programmeToCompare (modulesAl)
    const modulesAlList = await this.prisma.module.findMany({
      where: { idProgramme: comparaison.idProgrammeToCompare },
      select: {
        id: true,
        nomModule: true,
        dureeEnHeures: true,
        codeModule: true,
        nomModuleEn: true,
      },
    });

    // Format modulesTn as strings
    const modulesTn = modulesTnList.map(
      (module) =>
        `${module.nomModule || ''},${module.dureeEnHeures?.toString() || ''}`,
    );

    const modulesTnEn = modulesTnList.map(
      (module) =>
        `${module.nomModuleEn || ''},${module.dureeEnHeures?.toString() || ''}`,
    );

    const modulesAl: unknown[] = [];
    const modulesAlEn: unknown[] = [];
    const ecartList: unknown[] = [];

    // Process each module in modulesAl
    for (const module of modulesAlList) {
      // Get sous-modules for this module
      const sousModules = await this.prisma.sousModule.findMany({
        where: { idModule: module.id },
        select: {
          id: true,
          nomSousModule: true,
          codeObjectif: true,
        },
      });

      // Initialize array for sous-modules grouped by moduleTn
      const sousModulesByModuleTn: unknown[][] = Array(modulesTn.length)
        .fill(null)
        .map(() => []);

      // Process each sous-module
      for (const submodule of sousModules) {
        // Find similar objectives for this sous-module
        const similarObjectives = await this.prisma.sousModuleSimilarite.findMany({
          where: {
            comparaisonId,
            idSousModuleComparedTo: submodule.id,
          },
          select: {
            id: true,
            idSousModuleComparable: true,
            idSousModuleComparedTo: true,
          },
        });

        // If no similar objectives found, add to ecartList
        if (similarObjectives.length === 0) {
          ecartList.push({
            module_id: module.id,
            nom_module: module.nomModule,
            submodule_id: submodule.id,
            nom_sousmodule: submodule.nomSousModule,
            description_sousmodule: null, // SousModule doesn't have Description field in the model
            Code_Objectif: submodule.codeObjectif,
            Code_Module: module.codeModule,
          });
        }

        // Process each similar objective
        for (const objective of similarObjectives) {
          // Get the similar sous-module (comparable)
          if (!objective.idSousModuleComparable) continue;
          
          const similarSubmodule = await this.prisma.sousModule.findUnique({
            where: { id: objective.idSousModuleComparable },
            select: {
              id: true,
              nomSousModule: true,
              codeObjectif: true,
              idModule: true,
            },
          });

          if (!similarSubmodule?.idModule) continue;

          const similarModuleTn = await this.prisma.module.findUnique({
            where: { id: similarSubmodule.idModule },
            select: {
              nomModule: true,
              codeModule: true,
            },
          });

          if (!similarModuleTn) continue;

          // Get the comparedTo sous-module (referent)
          if (!objective.idSousModuleComparedTo) continue;

          const similarSubmoduleRefent = await this.prisma.sousModule.findUnique({
            where: { id: objective.idSousModuleComparedTo },
            select: {
              id: true,
              nomSousModule: true,
              codeObjectif: true,
            },
          });

          if (!similarSubmoduleRefent) continue;

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
          }
        }
      }

      // Build the module entry
      const moduleEntry = [
        `${module.nomModule},${module.codeModule || '0'},${module.dureeEnHeures?.toString() || ''}`,
        ...sousModulesByModuleTn,
      ];

      modulesAl.push(moduleEntry);

      // Build the module entry for English version
      const moduleEntryEn = [
        `${module.nomModuleEn || module.nomModule},${module.codeModule || '0'},${module.dureeEnHeures?.toString() || ''}`,
        ...sousModulesByModuleTn, // Same structure for English
      ];

      modulesAlEn.push(moduleEntryEn);
    }

    return {
      comparaisonID: comparaison.id,
      id_Programme_Compare: comparaison.idProgrammeToCompare,
      Nom_Programme_Comapare: comparaison.programmeToCompare?.nomProgramme || null,
      id_Programme_Comparable: comparaison.idProgrammeComparedTo,
      Nom_Programme_Comparable: comparaison.programmeComparedTo?.nomProgramme || null,
      TauxSimilarité: comparaison.tauxDeSimilarite?.toString() || null,
      modulesTn,
      modulesTn_en: modulesTnEn,
      modulesAl,
      modulesAl_en: modulesAlEn,
      ecart: ecartList,
    };
  }
}

