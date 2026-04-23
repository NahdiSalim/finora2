/**
 * Canonical invoice template IDs — the only values ever written to the database.
 */
export const INVOICE_TEMPLATE_IDS = [
  "classic",
  "modern",
  "elegant",
  "compact",
] as const;
export type InvoiceTemplateId = (typeof INVOICE_TEMPLATE_IDS)[number];

/**
 * Internal render IDs used by FactureTemplate.tsx.
 * French names exist for historical reasons; canonical DB values use English.
 */
export type TemplateRenderId = "classic" | "moderne" | "elegante" | "compacte";

/**
 * Maps a raw DB value → internal render ID.
 *
 * Canonical IDs (classic, modern, elegant, compact) are the only values
 * ever written to the database.
 *
 * Legacy French aliases (moderne, elegante, compacte) are accepted in the READ
 * path for backward compatibility only — they must never be written to the DB.
 */
export function resolveInvoiceTemplate(
  raw: string | null | undefined,
): TemplateRenderId {
  const map: Record<string, TemplateRenderId> = {
    // ── Canonical (write + read) ─────────────────────────────────────────────
    classic: "classic",
    modern: "moderne",
    elegant: "elegante",
    compact: "compacte",
    // ── Legacy aliases (read-only, backward compat) ──────────────────────────
    moderne: "moderne",
    elegante: "elegante",
    compacte: "compacte",
  };
  if (raw && map[raw]) return map[raw];
  if (raw)
    console.warn(
      `[FactureTemplate] Template inconnu : "${raw}" — fallback sur "classic".`,
    );
  return "classic";
}
