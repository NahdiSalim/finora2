export type DevisStatus = "en_attente" | "accepte" | "refuse" | "facture";

export interface DevisLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface DevisSupplier {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  address?: string;
  taxId?: string;
  logoUrl?: string;
}

export interface Devis {
  id: number;
  number: string;
  status: DevisStatus;
  tvaRate: number;
  validUntil: string;
  lines: DevisLine[];
  notes: string;
  amountHT: number;
  amountTVA: number;
  amountTTC: number;
  pdfUrl?: string;
  supplierId?: number;
  supplier?: DevisSupplier | null;
  createdAt: string;
}

export interface DevisFormValues {
  number: string;
  status: DevisStatus;
  tvaRate: number;
  validUntil: string;
  lines: DevisLine[];
  notes: string;
  supplierId?: number;
}
