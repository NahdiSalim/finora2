export type BonLivraisonStatus = "en_attente" | "livre" | "annule";

export interface BonLivraisonLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface BonLivraisonSupplier {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  address?: string;
  taxId?: string;
  logoUrl?: string;
}

export interface BonLivraison {
  id: number;
  number: string;
  status: BonLivraisonStatus;
  tvaRate: number;
  deliveryDate: string;
  lines: BonLivraisonLine[];
  notes: string;
  amountHT: number;
  amountTVA: number;
  amountTTC: number;
  supplierId?: number;
  supplier?: BonLivraisonSupplier | null;
  createdAt: string;
}

export interface BonLivraisonFormValues {
  number: string;
  status: BonLivraisonStatus;
  tvaRate: number;
  deliveryDate: string;
  lines: BonLivraisonLine[];
  notes: string;
  supplierId?: number;
}
