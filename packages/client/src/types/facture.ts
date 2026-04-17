export type FactureStatus =
  | "draft"
  | "sent"
  | "paid"
  | "partial"
  | "overdue"
  | "cancelled";

export type PaymentStatus = "unpaid" | "paid" | "partial";

export type DiscountType = "percentage" | "fixed";

export interface FactureCompany {
  id?: number;
  name?: string;
  legalName?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  email?: string | null;
  vatNumber?: string | null;
  logoUrl?: string | null;
}

export interface FactureLine {
  id?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal?: number;
}

export interface Supplier {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  address?: string;
  taxId?: string;
  logoUrl?: string;
}

export interface Facture {
  id: number;
  number?: string; // UI property for invoice number
  invoiceNumber?: string; // Backend property
  status: FactureStatus;
  dueDate: string;
  tvaRate?: number; // UI property for VAT rate
  vatRate?: number; // Backend property
  discountType: DiscountType | null;
  discountValue: number | null;
  amountHT?: number; // UI property for subtotal
  subtotal?: number; // Backend property
  discountAmount: number | null;
  amountTVA?: number; // UI property for VAT amount
  vatAmount?: number; // Backend property
  amountTTC?: number; // UI property for total
  total?: number; // Backend property
  amountPaid: number;
  amountRemaining: number;
  remainingAmount?: number; // Backend property
  notes: string | null;
  supplierId?: number;
  supplier?: Supplier;
  company?: FactureCompany;
  companyId?: number;
  createdById?: number;
  documentId?: number | null;
  createdAt: string;
  updatedAt?: string;
  lines: FactureLine[];
  pdfUrl?: string;
}

export interface FactureFormValues {
  invoiceNumber: string;
  status: "draft" | "sent" | "overdue";
  dueDate: string;
  vatRate: number;
  discountType?: DiscountType;
  discountValue?: number;
  lines: FactureLine[];
  notes?: string;
  supplierId?: number;
  paymentStatus: PaymentStatus;
  amountPaid?: number;
}
