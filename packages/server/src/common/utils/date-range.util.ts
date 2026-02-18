/**
 * Date range utilities for dashboard queries
 */
export class DateRangeUtil {
  /**
   * Get date range from various input parameters
   */
  static getDateRange(
    month?: number,
    year?: number,
    startDate?: string,
    endDate?: string,
    timePeriod?: string,
  ): { start: Date; end: Date } | null {
    // 1️⃣ Plage manuelle
    if (startDate && endDate) {
      return {
        start: new Date(startDate),
        end: new Date(endDate),
      };
    }

    // 2️⃣ Année + mois
    if (year && month) {
      return {
        start: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)),
        end: new Date(Date.UTC(year, month, 1, 0, 0, 0)),
      };
    }

    // 3️⃣ Année seule (CORRIGÉ ✅)
    if (year && !month) {
      return {
        start: new Date(Date.UTC(year, 0, 1, 0, 0, 0)),
        end: new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0)),
      };
    }

    // 4️⃣ Période courante : mois
    if (timePeriod === 'month') {
      const now = new Date();
      return {
        start: new Date(
          Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0),
        ),
        end: new Date(
          Date.UTC(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0),
        ),
      };
    }

    // 5️⃣ Période courante : année
    if (timePeriod === 'year') {
      const now = new Date();
      const y = now.getFullYear();
      return {
        start: new Date(Date.UTC(y, 0, 1, 0, 0, 0)),
        end: new Date(Date.UTC(y + 1, 0, 1, 0, 0, 0)),
      };
    }

    return null;
  }
}
