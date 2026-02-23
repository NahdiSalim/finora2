import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TextNormalizationUtil } from './text-normalization.util';

/**
 * Programme filtering utilities
 */
export class ProgrammeFilterUtil {
  /**
   * Get programme IDs that match the given program types
   */
  static async getProgrammeIdsByTypes(
    prisma: PrismaService,
    programTypes: string[],
  ): Promise<number[]> {
    if (!programTypes.length) return [];

    const normalizedTypes = programTypes.map((t) =>
      TextNormalizationUtil.normalizeProgramName(t),
    );

    const programmes = await prisma.programme.findMany({
      select: {
        id: true,
        nomProgramme: true,
        nomProgrammeEn: true,
      },
    });

    return programmes
      .filter((p) => {
        const names = [p.nomProgramme, p.nomProgrammeEn]
          .filter(Boolean)
          .map((n) => TextNormalizationUtil.normalizeProgramName(n!));

        return normalizedTypes.some((type) =>
          names.some((name) => name.includes(type)),
        );
      })
      .map((p) => p.id);
  }

  /**
   * Get programme IDs that match the given sector filter
   */
  static async getProgrammeIdsBySector(
    prisma: PrismaService,
    sector: string,
  ): Promise<number[]> {
    const normalizedSectorFilter =
      TextNormalizationUtil.normalizeSector(sector);
    const programmes = await prisma.programme.findMany({
      select: {
        id: true,
        secteur: true,
        secteurEn: true,
      },
    });

    return programmes
      .filter((programme) => {
        const candidates = [
          TextNormalizationUtil.normalizeSector(programme.secteur),
          TextNormalizationUtil.normalizeSector(programme.secteurEn),
        ];
        return TextNormalizationUtil.matchesNormalizedValue(
          candidates,
          normalizedSectorFilter,
        );
      })
      .map((programme) => programme.id);
  }

  /**
   * Build programme type where clause for Prisma queries
   */
  static async buildProgrammeTypeWhereClause(
    prisma: PrismaService,
    programTypes?: string,
  ): Promise<Prisma.ProgrammeWhereInput | null> {
    const normalizedTypes =
      TextNormalizationUtil.normalizeProgramTypes(programTypes);
    if (!normalizedTypes.length) return null;

    const programmeIds = await this.getProgrammeIdsByTypes(
      prisma,
      normalizedTypes,
    );
    if (!programmeIds.length) return null;

    return { id: { in: programmeIds } };
  }

  /**
   * Check if a programme matches the given program types
   */
  static matchesProgramType(
    programme: {
      nomProgramme: string | null;
      nomProgrammeEn: string | null;
    },
    normalizedProgramTypes: string[],
  ): boolean {
    if (!normalizedProgramTypes.length) return true;
    if (!programme) return false;
    const names = [
      (programme.nomProgramme || '').toUpperCase(),
      (programme.nomProgrammeEn || '').toUpperCase(),
    ];
    return normalizedProgramTypes.some((type) =>
      names.some((name) => name.startsWith(type)),
    );
  }

  /**
   * Check if a programme matches sector/subsector filters
   */
  static matchesSectorFilters(
    programme: {
      secteur: string | null;
      secteurEn: string | null;
      sousSecteur: string | null;
      sousSecteurEn: string | null;
    },
    sectorFilters: string[],
    subSectorFilters: string[],
  ): boolean {
    if (!programme) return false;
    const sectorCandidates = [
      TextNormalizationUtil.normalizeText(programme.secteur),
      TextNormalizationUtil.normalizeText(programme.secteurEn),
    ];
    const subSectorCandidates = [
      TextNormalizationUtil.normalizeText(programme.sousSecteur),
      TextNormalizationUtil.normalizeText(programme.sousSecteurEn),
    ];

    if (
      sectorFilters.length &&
      !sectorFilters.some((s) => sectorCandidates.includes(s))
    ) {
      return false;
    }

    if (
      subSectorFilters.length &&
      !subSectorFilters.some((s) => subSectorCandidates.includes(s))
    ) {
      return false;
    }

    return true;
  }

  /**
   * Build programme reference data map
   */
  static async buildProgrammeReferenceData(prisma: PrismaService) {
    return await prisma.programme.findMany({
      select: {
        id: true,
        nomProgramme: true,
        nomProgrammeEn: true,
        secteur: true,
        secteurEn: true,
        sousSecteur: true,
        sousSecteurEn: true,
        auteur: true,
      },
    });
  }

  /**
   * Find programme by name in reference data
   */
  static findProgrammeByName(
    programmeData: Awaited<ReturnType<typeof this.buildProgrammeReferenceData>>,
    name: string | null,
  ) {
    if (!name) return null;
    return (
      programmeData.find(
        (p) => p.nomProgramme === name || p.nomProgrammeEn === name,
      ) || null
    );
  }

  /**
   * Filter programmes by sector/subsector
   */
  static filterProgrammesBySector(
    programmes: Array<{
      secteur: string | null;
      secteurEn: string | null;
      sousSecteur: string | null;
      sousSecteurEn: string | null;
    }>,
    sector?: string,
    subSector?: string,
  ) {
    const sectorFilters = sector
      ? TextNormalizationUtil.parseSectorFilters(sector).map((s) =>
          TextNormalizationUtil.normalizeText(s),
        )
      : [];
    const subSectorFilters = subSector
      ? TextNormalizationUtil.parseSectorFilters(subSector).map((s) =>
          TextNormalizationUtil.normalizeText(s),
        )
      : [];

    return programmes.filter((p) =>
      this.matchesSectorFilters(p, sectorFilters, subSectorFilters),
    );
  }
}
