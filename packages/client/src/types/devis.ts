export type DevisStatus = "en_attente" | "accepte" | "refuse";

export type DiscountType = "percentage" | "fixed";

export interface DevisLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Devis {
  id: number;
  number: string;
  status: DevisStatus;
  tvaRate: number;
  validUntil: string;
  discountType: DiscountType;
  discountValue: number;
  lines: DevisLine[];
  notes: string;
  amountHT: number;
  amountTVA: number;
  amountTTC: number;
  pdfUrl?: string;
  createdAt: string;
}

export interface DevisFormValues {
  status: DevisStatus;
  tvaRate: number;
  validUntil: string;
  discountType: DiscountType;
  discountValue: number;
  lines: DevisLine[];
  notes: string;
}
