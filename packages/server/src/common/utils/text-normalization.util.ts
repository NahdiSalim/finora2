/**
 * Text normalization utilities for consistent text processing
 */
export class TextNormalizationUtil {
  /**
   * Normalize text by removing accents, converting to lowercase, and removing special characters
   */
  static normalizeText(text: string | null | undefined): string {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }
  static sanitizeNumericInput(value): number {
    if (value === null || value === undefined) return NaN;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const normalized = value.replace(/[^0-9.,-]/g, '').replace(',', '.');
      return Number(normalized);
    }
    return Number(value);
  }
  static normalizeSimilarityValue(value): number | null {
    const numeric = TextNormalizationUtil.sanitizeNumericInput(value);
    if (isNaN(numeric) || numeric < 0) return null;

    if (numeric > 1 && numeric <= 100) {
      return Number((numeric / 100).toFixed(4));
    }
    if (numeric > 100) return 1;

    return Number(numeric);
  }
  /**
   * Normalize sector names with common variations mapping
   */
  static normalizeSector(sector: string | null | undefined): string {
    if (!sector) return '';
    const normalized = this.normalizeText(sector);
    // Map common variations
    const sectorMap: Record<string, string> = {
      electricitelectronique: 'electricite_electronique',
      electricite: 'electricite_electronique',
      electronique: 'electricite_electronique',
      mecanique: 'mecanique_generale',
      mecaniquegenerale: 'mecanique_generale',
      transport: 'transport_conduite',
      transportconduite: 'transport_conduite',
    };
    return sectorMap[normalized] || normalized;
  }

  /**
   * Normalize label (alias for normalizeText)
   */
  static normalizeLabel(label: string | null | undefined): string {
    return this.normalizeText(label);
  }

  /**
   * Parse sector filters from comma-separated string
   */
  static parseSectorFilters(filters: string): string[] {
    return filters
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);
  }
  static normalizeProgramName(value: string): string {
    return value
      .normalize('NFD') // enlève accents
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9]/gi, '') // enlève espaces, -, .
      .toUpperCase()
      .trim();
  }

  /**
   * Normalize program types from comma-separated string
   */
  static normalizeProgramTypes(programTypes?: string): string[] {
    if (!programTypes) return [];
    return programTypes
      .split(',')
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
  }

  /**
   * Check if any candidate matches the target normalized value
   */
  static matchesNormalizedValue(candidates: string[], target: string): boolean {
    return candidates.some((c) => c === target);
  }

  /**
   * Get canonical sector label from normalized key
   */
  static canonicalSectorLabel(normalizedKey: string): string {
    const map: Record<string, string> = {
      electricite_electronique: 'Électricité / Électronique',
      mecanique_generale: 'Mécanique générale / Construction métallique',
      transport_conduite: 'Transport / Conduite / Maintenance',
    };
    return map[normalizedKey] || normalizedKey;
  }

  /**
   * Build bilingual label from French and English text
   * No fallback between languages - returns empty string if language-specific value is missing
   */
  static buildBilingualLabel(
    fr: string | null,
    en: string | null,
    defaultFr?: string,
    defaultEn?: string,
  ): {
    fr: string;
    en: string;
  } {
    return {
      fr: fr ?? defaultFr ?? '',
      en: en ?? defaultEn ?? '',
    };
  }
}
