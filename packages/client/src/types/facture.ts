export type FactureStatus =
  | "brouillon"
  | "payee"
  | "partiel"
  | "en_retard"
  | "annulee";

export type DiscountType = "percentage" | "fixed";

export interface FactureLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Facture {
  id: number;
  number: string;
  status: FactureStatus;
  tvaRate: number;
  dueDate: string;
  discountType: DiscountType;
  discountValue: number;
  lines: FactureLine[];
  notes: string;
  amountHT: number;
  amountTVA: number;
  amountTTC: number;
  amountPaid: number;
  amountRemaining: number;
  createdAt: string;
}

export interface FactureFormValues {
  status: FactureStatus;
  tvaRate: number;
  dueDate: string;
  discountType: DiscountType;
  discountValue: number;
  lines: FactureLine[];
  notes: string;
}
