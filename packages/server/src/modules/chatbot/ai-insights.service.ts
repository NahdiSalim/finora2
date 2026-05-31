import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

// ─── Types ────────────────────────────────────────────────────────────────────

export type InsightSeverity = 'info' | 'warning' | 'critical';
export type InsightType =
  | 'INVOICES_DUE_SOON'
  | 'RECURRING_LATE_SUPPLIER'
  | 'TVA_SPIKE'
  | 'HIGH_UNPAID'
  | 'LOW_ACTIVITY';

export interface AiInsight {
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  description: string;
  actionable: boolean;
  metadata: Record<string, unknown>;
  generatedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Wraps a promise with a timeout. Rejects with a timeout error if exceeded. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${label}`)), ms)
    ),
  ]);
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class AiInsightsService {
  private readonly logger = new Logger(AiInsightsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Compute all insights for a given company.
   * Rules run SEQUENTIALLY to avoid Prisma connection pool exhaustion.
   * Each rule has a 5s individual timeout. Total timeout: 20s.
   * Always resolves — never hangs.
   */
  async getInsights(companyId: number): Promise<AiInsight[]> {
    const insights: AiInsight[] = [];

    const rules: Array<{ name: InsightType; fn: () => Promise<AiInsight | null> }> = [
      { name: 'INVOICES_DUE_SOON', fn: () => this.checkInvoicesDueSoon(companyId) },
      { name: 'RECURRING_LATE_SUPPLIER', fn: () => this.checkRecurringLateSuppliers(companyId) },
      { name: 'TVA_SPIKE', fn: () => this.checkTvaSpike(companyId) },
      { name: 'HIGH_UNPAID', fn: () => this.checkHighUnpaid(companyId) },
      { name: 'LOW_ACTIVITY', fn: () => this.checkLowActivity(companyId) },
    ];

    for (const rule of rules) {
      try {
        const result = await withTimeout(rule.fn(), 5000, rule.name);
        if (result) insights.push(result);
      } catch (err: any) {
        this.logger.warn(`[getInsights] ${rule.name} skipped: ${err?.message}`);
      }
    }

    // Sort: critical first, then warning, then info
    const order: Record<InsightSeverity, number> = { critical: 0, warning: 1, info: 2 };
    return insights.sort((a, b) => order[a.severity] - order[b.severity]);
  }

  // ─── Rule 1: Invoices due within 7 days ────────────────────────────────────

  private async checkInvoicesDueSoon(companyId: number): Promise<AiInsight | null> {
    const now = new Date();
    // Use start-of-day / end-of-day to avoid @db.Date vs DateTime timezone issues
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const in7DaysEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        companyId,
        status: { in: ['sent', 'partial', 'draft'] },
        dueDate: { gte: todayStart, lte: in7DaysEnd },
      },
      select: {
        id: true,
        invoiceNumber: true,
        dueDate: true,
        remainingAmount: true,
        supplier: { select: { name: true, company: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 50,
    });

    if (invoices.length === 0) return null;

    const totalAtRisk = invoices.reduce((sum, inv) => sum + Number(inv.remainingAmount), 0);
    const round = (v: number) => Math.round(v * 100) / 100;

    const soonestDays = Math.ceil(
      (new Date(invoices[0].dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    const severity: InsightSeverity =
      invoices.length >= 3 || totalAtRisk > 5000 ? 'critical' : 'warning';

    return {
      type: 'INVOICES_DUE_SOON',
      severity,
      title: `${invoices.length} facture${invoices.length > 1 ? 's' : ''} bientôt en retard`,
      description:
        `${invoices.length} facture${invoices.length > 1 ? 's arrivent' : ' arrive'} à échéance dans moins de 7 jours` +
        (soonestDays <= 0
          ? " (dont une aujourd'hui)"
          : ` (la plus proche dans ${soonestDays} jour${soonestDays > 1 ? 's' : ''})`) +
        `. Montant à risque : ${round(totalAtRisk).toLocaleString('fr-FR')} DT.`,
      actionable: true,
      metadata: {
        count: invoices.length,
        totalAtRisk: round(totalAtRisk),
        invoices: invoices.slice(0, 10).map((inv) => ({
          id: inv.id,
          number: inv.invoiceNumber,
          dueDate: inv.dueDate,
          remaining: round(Number(inv.remainingAmount)),
          supplier: inv.supplier?.name ?? inv.supplier?.company ?? 'Inconnu',
        })),
      },
      generatedAt: now.toISOString(),
    };
  }

  // ─── Rule 2: Suppliers with recurring late payments ────────────────────────

  private async checkRecurringLateSuppliers(companyId: number): Promise<AiInsight | null> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        companyId,
        status: { in: ['overdue', 'sent', 'partial'] },
        dueDate: { lt: todayStart },
        supplierId: { not: null },
      },
      select: {
        id: true,
        remainingAmount: true,
        supplierId: true,
        supplier: { select: { id: true, name: true, company: true } },
      },
      take: 200,
    });

    if (overdueInvoices.length === 0) return null;

    // Group by supplier
    const bySupplier = new Map<number, { count: number; totalRemaining: number; name: string }>();
    for (const inv of overdueInvoices) {
      if (!inv.supplierId) continue;
      const existing = bySupplier.get(inv.supplierId);
      if (existing) {
        existing.count++;
        existing.totalRemaining += Number(inv.remainingAmount);
      } else {
        bySupplier.set(inv.supplierId, {
          count: 1,
          totalRemaining: Number(inv.remainingAmount),
          name: inv.supplier?.name ?? inv.supplier?.company ?? `Fournisseur #${inv.supplierId}`,
        });
      }
    }

    const recurringLate = [...bySupplier.entries()]
      .filter(([, s]) => s.count >= 2)
      .map(([supplierId, s]) => ({ supplierId, ...s }));

    if (recurringLate.length === 0) return null;

    const round = (v: number) => Math.round(v * 100) / 100;
    const topSupplier = recurringLate[0];
    const totalAllRemaining = recurringLate.reduce((s, r) => s + r.totalRemaining, 0);

    return {
      type: 'RECURRING_LATE_SUPPLIER',
      severity: 'warning',
      title: `${recurringLate.length} fournisseur${recurringLate.length > 1 ? 's' : ''} avec retards récurrents`,
      description:
        `"${topSupplier.name}" a ${topSupplier.count} factures en retard` +
        (recurringLate.length > 1
          ? ` et ${recurringLate.length - 1} autre${recurringLate.length > 2 ? 's' : ''} fournisseur${recurringLate.length > 2 ? 's' : ''} similaire${recurringLate.length > 2 ? 's' : ''}`
          : '') +
        `. Total impayé : ${round(totalAllRemaining).toLocaleString('fr-FR')} DT.`,
      actionable: true,
      metadata: {
        suppliersCount: recurringLate.length,
        suppliers: recurringLate.map((s) => ({ ...s, totalRemaining: round(s.totalRemaining) })),
      },
      generatedAt: now.toISOString(),
    };
  }

  // ─── Rule 3: Abnormal TVA spike vs last month ──────────────────────────────

  private async checkTvaSpike(companyId: number): Promise<AiInsight | null> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed

    const currentStart = new Date(year, month, 1);
    const currentEnd = new Date(year, month + 1, 0, 23, 59, 59);
    const prevStart = new Date(year, month - 1, 1);
    const prevEnd = new Date(year, month, 0, 23, 59, 59);

    // Sequential — avoid concurrent aggregate queries on same table
    const currentAgg = await this.prisma.invoice.aggregate({
      where: { companyId, createdAt: { gte: currentStart, lte: currentEnd } },
      _sum: { vatAmount: true },
      _count: { id: true },
    });

    const prevAgg = await this.prisma.invoice.aggregate({
      where: { companyId, createdAt: { gte: prevStart, lte: prevEnd } },
      _sum: { vatAmount: true },
      _count: { id: true },
    });

    const currentTva = Number(currentAgg._sum.vatAmount ?? 0);
    const prevTva = Number(prevAgg._sum.vatAmount ?? 0);

    if (prevTva < 1 || currentAgg._count.id === 0) return null;

    const changePercent = ((currentTva - prevTva) / prevTva) * 100;
    if (changePercent < 20) return null;

    const round = (v: number) => Math.round(v * 100) / 100;
    const severity: InsightSeverity = changePercent >= 50 ? 'critical' : 'warning';

    return {
      type: 'TVA_SPIKE',
      severity,
      title: `TVA +${Math.round(changePercent)}% par rapport au mois dernier`,
      description:
        `La TVA collectée ce mois (${round(currentTva).toLocaleString('fr-FR')} DT) est en hausse de ${Math.round(changePercent)}% ` +
        `par rapport au mois précédent (${round(prevTva).toLocaleString('fr-FR')} DT). Vérifiez si cette hausse est attendue.`,
      actionable: false,
      metadata: {
        currentMonthTva: round(currentTva),
        previousMonthTva: round(prevTva),
        changePercent: Math.round(changePercent),
        currentInvoiceCount: currentAgg._count.id,
      },
      generatedAt: now.toISOString(),
    };
  }

  // ─── Rule 4: High unpaid amount ────────────────────────────────────────────

  private async checkHighUnpaid(companyId: number): Promise<AiInsight | null> {
    const agg = await this.prisma.invoice.aggregate({
      where: {
        companyId,
        status: { in: ['sent', 'partial', 'overdue'] },
      },
      _sum: { remainingAmount: true },
      _count: { id: true },
    });

    const totalUnpaid = Number(agg._sum.remainingAmount ?? 0);
    const count = agg._count.id;

    if (totalUnpaid < 1000 || count === 0) return null;

    const round = (v: number) => Math.round(v * 100) / 100;
    const severity: InsightSeverity =
      totalUnpaid >= 20000 ? 'critical' : totalUnpaid >= 5000 ? 'warning' : 'info';

    return {
      type: 'HIGH_UNPAID',
      severity,
      title: `${round(totalUnpaid).toLocaleString('fr-FR')} DT impayés`,
      description:
        `${count} facture${count > 1 ? 's' : ''} non réglée${count > 1 ? 's' : ''} pour un total de ` +
        `${round(totalUnpaid).toLocaleString('fr-FR')} DT. ` +
        (totalUnpaid >= 20000
          ? 'Montant critique — action urgente recommandée.'
          : 'Pensez à relancer vos clients.'),
      actionable: true,
      metadata: {
        totalUnpaid: round(totalUnpaid),
        invoiceCount: count,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── Rule 5: Low activity (no invoice in 10 days) ─────────────────────────

  private async checkLowActivity(companyId: number): Promise<AiInsight | null> {
    const INACTIVITY_DAYS = 10;
    const threshold = new Date(Date.now() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000);

    const recentCount = await this.prisma.invoice.count({
      where: { companyId, createdAt: { gte: threshold } },
    });

    if (recentCount > 0) return null;

    const totalCount = await this.prisma.invoice.count({ where: { companyId } });
    if (totalCount === 0) return null;

    const lastInvoice = await this.prisma.invoice.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    const daysSinceLast = lastInvoice
      ? Math.floor((Date.now() - new Date(lastInvoice.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : INACTIVITY_DAYS;

    return {
      type: 'LOW_ACTIVITY',
      severity: 'info',
      title: `Aucune facture depuis ${daysSinceLast} jours`,
      description:
        `Aucune nouvelle facture n'a été créée depuis ${daysSinceLast} jour${daysSinceLast > 1 ? 's' : ''}. ` +
        `Vérifiez si votre activité est à jour ou si des factures sont en attente de saisie.`,
      actionable: true,
      metadata: {
        daysSinceLastInvoice: daysSinceLast,
        lastInvoiceDate: lastInvoice?.createdAt ?? null,
      },
      generatedAt: new Date().toISOString(),
    };
  }
}
