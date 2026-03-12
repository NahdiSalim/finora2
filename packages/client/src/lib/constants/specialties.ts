/**
 * Secteurs et spécialités alignés avec le profil comptable.
 * Utilisé pour le filtre "Spécialité" (visiteur / réseau) et le multiselect du profil.
 */
export const SECTOR_TO_SPECIALTIES: Record<string, string[]> = {
  "Expert Comptable": [
    "Comptabilité générale",
    "Comptabilité analytique",
    "Audit légal",
    "Conseil en gestion",
    "Fiscalité des entreprises",
    "Consolidation",
  ],
  Comptable: [
    "Comptabilité générale",
    "Paie",
    "TVA",
    "Déclarations fiscales",
    "Tenue de livres",
  ],
  Fiscaliste: [
    "Impôt sur les sociétés",
    "TVA",
    "Optimisation fiscale",
    "Fiscalité internationale",
    "Contrôles fiscaux",
  ],
  Finance: [
    "Analyse financière",
    "Trésorerie",
    "Financement",
    "Due diligence",
    "Evaluation",
  ],
  Audit: [
    "Audit légal",
    "Audit interne",
    "Commissariat aux comptes",
    "Audit de processus",
  ],
  Conseil: [
    "Conseil en gestion",
    "Stratégie",
    "Restructuration",
    "Acquisition",
  ],
};

/** Toutes les spécialités possibles (secteurs + spécialités détaillées), pour le filtre. */
const ALL_SPECIALTIES_SET = new Set<string>();
Object.keys(SECTOR_TO_SPECIALTIES).forEach((sector) =>
  ALL_SPECIALTIES_SET.add(sector),
);
Object.values(SECTOR_TO_SPECIALTIES).forEach((list) =>
  list.forEach((s) => ALL_SPECIALTIES_SET.add(s)),
);
export const ALL_SPECIALTIES_FOR_FILTER =
  Array.from(ALL_SPECIALTIES_SET).sort();

/** Options du filtre Note (plage d'avis). */
export const RATING_FILTER_OPTIONS = [
  { value: "", label: "Note" },
  { value: "1-2", label: "1-2", min: 1, max: 2 },
  { value: "2-3", label: "2-3", min: 2, max: 3 },
  { value: "3-4", label: "3-4", min: 3, max: 4 },
  { value: "4-5", label: "4-5", min: 4, max: 5 },
] as const;
