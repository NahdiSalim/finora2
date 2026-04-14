export type FactureStatus =
  | "draft"
  | "sent"
  | "paid"
  | "partial"
  | "overdue"
  | "cancelled";

export type DiscountType = "percentage" | "fixed";

export interface FactureLine {
  id?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal?: number;
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
  amountPaid?: number; // UI property for amount paid
  amountRemaining?: number; // UI property for remaining amount
  remainingAmount?: number; // Backend property
  notes: string | null;
  clientName: string | null;
  clientAddress: string | null;
  company?: any;
  companyId?: number;
  createdById?: number;
  documentId?: number | null;
  createdAt: string;
  updatedAt?: string;
  lines: FactureLine[];
  pdfUrl?: string;
}

export interface FactureFormValues {
  status?: FactureStatus;
  dueDate: string;
  vatRate: number;
  discountType?: DiscountType;
  discountValue?: number;
  lines: FactureLine[];
  notes?: string;
  clientName?: string;
  clientAddress?: string;
}
