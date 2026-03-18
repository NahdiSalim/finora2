export const DOCUMENT_CATEGORIES = [
  { value: "facture", label: "Facture" },
  { value: "contrat", label: "Contrat" },
  { value: "rapport", label: "Rapport" },
  { value: "autre", label: "Autre" },
] as const;

export type DocumentCategoryValue =
  (typeof DOCUMENT_CATEGORIES)[number]["value"];
