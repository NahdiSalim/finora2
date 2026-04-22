export type BonCommandeStatus = "brouillon" | "confirme" | "annule";

export interface BonCommandeLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface BonCommandeSupplier {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  address?: string;
  taxId?: string;
  logoUrl?: string;
}

export interface BonCommande {
  id: number;
  number: string;
  status: BonCommandeStatus;
  tvaRate: number;
  validUntil: string;
  lines: BonCommandeLine[];
  notes: string;
  amountHT: number;
  amountTVA: number;
  amountTTC: number;
  supplierId?: number;
  supplier?: BonCommandeSupplier | null;
  createdAt: string;
}

export interface BonCommandeFormValues {
  number: string;
  status: BonCommandeStatus;
  tvaRate: number;
  validUntil: string;
  lines: BonCommandeLine[];
  notes: string;
  supplierId?: number;
}
