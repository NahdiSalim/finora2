/**
 * Canonical invoice template IDs — the only values ever written to the database.
 * Shared between the update-company DTO (validation) and invoice.service (PDF rendering).
 */
export const INVOICE_TEMPLATE_IDS = ['classic', 'modern', 'elegant', 'compact'] as const;
export type InvoiceTemplateId = (typeof INVOICE_TEMPLATE_IDS)[number];

/**
 * Maps a raw DB value → internal render ID used by buildHtml().
 *
 * Canonical IDs (classic, modern, elegant, compact) are the only values
 * ever written to the database.
 *
 * Legacy French aliases (moderne, elegante, compacte) are accepted in the READ
 * path for backward compatibility only — they must never be written to the DB.
 */
export function resolveTemplate(raw: string | null | undefined): string {
  const map: Record<string, string> = {
    // ── Canonical (write + read) ─────────────────────────────────────────────
    classic: 'classic',
    modern: 'moderne',
    elegant: 'elegante',
    compact: 'compacte',
    // ── Legacy aliases (read-only, backward compat) ──────────────────────────
    moderne: 'moderne',
    elegante: 'elegante',
    compacte: 'compacte',
  };
  if (raw && map[raw]) return map[raw];
  if (raw) console.warn(`[InvoiceTemplate] Template inconnu : "${raw}" — fallback sur classic`);
  return 'classic';
}
