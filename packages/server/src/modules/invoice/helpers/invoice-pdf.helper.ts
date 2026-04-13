// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');
import { PassThrough } from 'stream';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface PdfLine {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface PdfCompany {
  name: string;
  legalName?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  email?: string | null;
  vatNumber?: string | null;
}

export interface InvoicePdfData {
  invoiceNumber: string;
  status: string;
  createdAt: string | Date;
  dueDate: string | Date;
  vatRate: number;
  discountType: string | null;
  discountValue: number | null;
  subtotal: number;
  discountAmount: number | null;
  vatAmount: number;
  total: number;
  amountPaid: number;
  remainingAmount: number;
  notes: string | null;
  clientName: string | null;
  clientAddress?: string | null;
  lines: PdfLine[];
  company?: PdfCompany | null;
}

// ─── Layout constants ─────────────────────────────────────────────────────────

const PAGE_W = 595.28; // A4 width in points
const MARGIN = 50;
const RIGHT = PAGE_W - MARGIN; // 545.28 — right edge of content
const CONT_W = RIGHT - MARGIN; // 495.28 — usable content width

/**
 * Absolute X positions of each table column.
 * Total: 220 + 65 + 105 + 105 = 495 (≈ CONT_W)
 */
const COL = {
  desc: MARGIN, //  50  description start
  qty: MARGIN + 220, // 270  quantity
  price: MARGIN + 285, // 335  unit price
  total: MARGIN + 390, // 440  line total
};

const HEADER_H = 110;
const ROW_H = 26;
const TABLE_HEADER_H = 28;

// ─── Palette ──────────────────────────────────────────────────────────────────

const C = {
  primary: '#1d4ed8',
  primaryLight: '#eff6ff',
  dark: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
  rowAlt: '#f8fafc',
  white: '#ffffff',
  success: '#16a34a',
  danger: '#dc2626',
};

const STATUS_FR: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Envoyée',
  paid: 'Payée',
  partial: 'Partiel',
  overdue: 'En retard',
  cancelled: 'Annulée',
};

const STATUS_COLOR: Record<string, string> = {
  draft: '#94a3b8',
  sent: '#3b82f6',
  paid: '#16a34a',
  partial: '#f59e0b',
  overdue: '#dc2626',
  cancelled: '#475569',
};

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmtAmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) +
  ' DT';

const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

// ─── Section: Header bar ──────────────────────────────────────────────────────

function drawHeader(doc: PDFKit.PDFDocument, data: InvoicePdfData): void {
  // Full-width blue bar
  doc.rect(0, 0, PAGE_W, HEADER_H).fill(C.primary);

  // Title
  doc
    .font('Helvetica-Bold')
    .fontSize(30)
    .fillColor(C.white)
    .text('FACTURE', MARGIN, 28, { lineBreak: false });

  // Invoice number below title
  doc
    .font('Helvetica')
    .fontSize(13)
    .fillColor('rgba(255,255,255,0.8)')
    .text(data.invoiceNumber, MARGIN, 66, { lineBreak: false });

  // Status badge — right side of header
  const label = STATUS_FR[data.status] ?? data.status;
  const badgeColor = STATUS_COLOR[data.status] ?? C.muted;
  const badgeW = 114;
  const badgeX = RIGHT - badgeW;
  const badgeY = 36;

  doc.roundedRect(badgeX, badgeY, badgeW, 32, 6).fill(C.white);
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor(badgeColor)
    .text(label.toUpperCase(), badgeX, badgeY + 11, {
      width: badgeW,
      align: 'center',
      lineBreak: false,
    });
}

// ─── Section: Company + invoice meta ─────────────────────────────────────────

function drawInfoSection(doc: PDFKit.PDFDocument, data: InvoicePdfData): number {
  const sectionY = HEADER_H + 22;

  // ── Left column: emitter ──
  doc
    .font('Helvetica-Bold')
    .fontSize(8)
    .fillColor(C.muted)
    .text('ÉMETTEUR', MARGIN, sectionY, { lineBreak: false });

  let cy = sectionY + 14;

  if (data.company) {
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(C.dark)
      .text(data.company.legalName ?? data.company.name, MARGIN, cy, { lineBreak: false });
    cy += 17;

    doc.font('Helvetica').fontSize(9).fillColor(C.muted);

    if (data.company.address) {
      doc.text(data.company.address, MARGIN, cy, { lineBreak: false });
      cy += 13;
    }

    const cityLine = [data.company.postalCode, data.company.city].filter(Boolean).join(' ');
    if (cityLine) {
      doc.text(cityLine, MARGIN, cy, { lineBreak: false });
      cy += 13;
    }

    if (data.company.phone) {
      doc.text(`Tél : ${data.company.phone}`, MARGIN, cy, { lineBreak: false });
      cy += 13;
    }

    if (data.company.email) {
      doc.text(data.company.email, MARGIN, cy, { lineBreak: false });
      cy += 13;
    }

    if (data.company.vatNumber) {
      doc.text(`N° TVA : ${data.company.vatNumber}`, MARGIN, cy, { lineBreak: false });
    }
  } else {
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(C.muted)
      .text('—', MARGIN, cy, { lineBreak: false });
  }

  // ── DESTINATAIRE block (below emitter in the left column) ──
  if (data.clientName) {
    cy += 18;

    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(C.muted)
      .text('DESTINATAIRE', MARGIN, cy, { lineBreak: false });
    cy += 14;

    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(C.dark)
      .text(data.clientName, MARGIN, cy, { width: 230, lineBreak: false });
    cy += 16;

    if (data.clientAddress) {
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(C.muted)
        .text(data.clientAddress, MARGIN, cy, { width: 230 });
      cy = doc.y + 4;
    }
  }

  // ── Right column: invoice meta ──
  const metaLabelX = RIGHT - 230;
  const metaValueX = RIGHT - 105;
  const metaValueW = 105;

  const metaRows: [string, string][] = [
    ["Date d'émission", fmtDate(data.createdAt)],
    ["Date d'échéance", fmtDate(data.dueDate)],
    ['Taux de TVA', `${data.vatRate} %`],
  ];

  let my = sectionY;
  for (const [label, value] of metaRows) {
    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(C.muted)
      .text(label.toUpperCase(), metaLabelX, my, { width: 120, align: 'left', lineBreak: false });

    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(C.dark)
      .text(value, metaValueX, my, { width: metaValueW, align: 'right', lineBreak: false });

    my += 20;
  }

  // Divider below info section
  const dividerY = Math.max(cy, my) + 20;
  doc
    .moveTo(MARGIN, dividerY)
    .lineTo(RIGHT, dividerY)
    .lineWidth(0.75)
    .strokeColor(C.border)
    .stroke();

  return dividerY;
}

// ─── Section: Line items table ────────────────────────────────────────────────

function drawLinesTable(doc: PDFKit.PDFDocument, data: InvoicePdfData, startY: number): number {
  let y = startY;

  // ── Table header row ──
  doc.rect(MARGIN, y, CONT_W, TABLE_HEADER_H).fill(C.primary);

  const hty = y + 9; // header text Y
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white);
  doc.text('DESCRIPTION', COL.desc, hty, { width: COL.qty - COL.desc - 8, lineBreak: false });
  doc.text('QTÉ', COL.qty, hty, {
    width: COL.price - COL.qty - 8,
    align: 'center',
    lineBreak: false,
  });
  doc.text('PRIX UNIT.', COL.price, hty, {
    width: COL.total - COL.price - 8,
    align: 'right',
    lineBreak: false,
  });
  doc.text('TOTAL HT', COL.total, hty, {
    width: RIGHT - COL.total,
    align: 'right',
    lineBreak: false,
  });

  y += TABLE_HEADER_H;

  // ── Data rows ──
  for (let i = 0; i < data.lines.length; i++) {
    const line = data.lines[i];

    if (i % 2 === 1) {
      doc.rect(MARGIN, y, CONT_W, ROW_H).fill(C.rowAlt);
    }

    const ty = y + 8;
    doc.font('Helvetica').fontSize(9).fillColor(C.dark);

    doc.text(line.description, COL.desc, ty, {
      width: COL.qty - COL.desc - 10,
      lineBreak: false,
      ellipsis: true,
    });
    doc.text(String(line.quantity), COL.qty, ty, {
      width: COL.price - COL.qty - 8,
      align: 'center',
      lineBreak: false,
    });
    doc.text(fmtAmt(line.unitPrice), COL.price, ty, {
      width: COL.total - COL.price - 8,
      align: 'right',
      lineBreak: false,
    });
    doc.text(fmtAmt(line.lineTotal), COL.total, ty, {
      width: RIGHT - COL.total,
      align: 'right',
      lineBreak: false,
    });

    y += ROW_H;

    // Row separator
    doc.moveTo(MARGIN, y).lineTo(RIGHT, y).lineWidth(0.4).strokeColor(C.border).stroke();
  }

  return y;
}

// ─── Section: Totals ─────────────────────────────────────────────────────────

function drawTotals(doc: PDFKit.PDFDocument, data: InvoicePdfData, startY: number): number {
  let y = startY + 18;

  const labelX = COL.total - 120; // left edge of label column
  const labelW = 115;
  const valueW = RIGHT - COL.total;

  const row = (label: string, value: string, opts: { bold?: boolean; color?: string } = {}) => {
    const font = opts.bold ? 'Helvetica-Bold' : 'Helvetica';
    const color = opts.color ?? C.dark;

    doc
      .font(font)
      .fontSize(9)
      .fillColor(C.muted)
      .text(label, labelX, y, { width: labelW, align: 'right', lineBreak: false });
    doc
      .font(font)
      .fontSize(9)
      .fillColor(color)
      .text(value, COL.total, y, { width: valueW, align: 'right', lineBreak: false });
    y += 17;
  };

  row('Sous-total HT', fmtAmt(data.subtotal));

  if (data.discountAmount && data.discountAmount > 0) {
    const discLabel =
      data.discountType === 'percentage' ? `Remise (${data.discountValue} %)` : 'Remise';
    row(discLabel, `– ${fmtAmt(data.discountAmount)}`);
  }

  row('TVA', fmtAmt(data.vatAmount));

  // ── Total TTC highlight ──
  const totalBoxH = 30;
  doc.rect(labelX - 8, y - 4, RIGHT - labelX + 8, totalBoxH).fill(C.primaryLight);

  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor(C.primary)
    .text('Total TTC', labelX, y + 5, { width: labelW, align: 'right', lineBreak: false });
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor(C.primary)
    .text(fmtAmt(data.total), COL.total, y + 5, {
      width: valueW,
      align: 'right',
      lineBreak: false,
    });
  y += totalBoxH + 8;

  // ── Paid / remaining (only if relevant) ──
  if (data.amountPaid > 0) {
    row('Montant payé', fmtAmt(data.amountPaid), { color: C.success });

    const remainColor = data.remainingAmount > 0 ? C.danger : C.success;
    row('Reste à payer', fmtAmt(data.remainingAmount), {
      bold: data.remainingAmount > 0,
      color: remainColor,
    });
  }

  return y;
}

// ─── Section: Notes ───────────────────────────────────────────────────────────

function drawNotes(doc: PDFKit.PDFDocument, data: InvoicePdfData, startY: number): number {
  if (!data.notes?.trim()) return startY;

  let y = startY + 24;

  doc.moveTo(MARGIN, y).lineTo(RIGHT, y).lineWidth(0.5).strokeColor(C.border).stroke();

  y += 12;

  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor(C.dark)
    .text('Notes', MARGIN, y, { lineBreak: false });
  y += 14;

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(C.muted)
    .text(data.notes, MARGIN, y, { width: CONT_W });

  return doc.y + 8;
}

// ─── Section: Footer ─────────────────────────────────────────────────────────

function drawFooter(doc: PDFKit.PDFDocument): void {
  const y = 808;
  const generated = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  doc.moveTo(MARGIN, y).lineTo(RIGHT, y).lineWidth(0.5).strokeColor(C.border).stroke();

  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(C.muted)
    .text(`Généré par Finora — ${generated}`, MARGIN, y + 8, {
      width: CONT_W,
      align: 'center',
      lineBreak: false,
    });
}

// ─── Entry point ─────────────────────────────────────────────────────────────

/**
 * Builds a PDF document for an invoice and resolves with the raw Buffer.
 * No temporary files are written — everything stays in memory via a PassThrough stream.
 */
export async function generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN, autoFirstPage: true });
    const chunks: Buffer[] = [];
    const pass = new PassThrough();

    doc.pipe(pass);
    pass.on('data', (chunk: Buffer) => chunks.push(chunk));
    pass.on('end', () => resolve(Buffer.concat(chunks)));
    pass.on('error', reject);
    doc.on('error', reject);

    // ── Draw sections ──
    drawHeader(doc, data);
    const infoEndY = drawInfoSection(doc, data);

    // Table starts just below the info section divider (dynamic — grows with recipient block)
    const tableY = infoEndY + 16;
    const afterTable = drawLinesTable(doc, data, tableY);
    const afterTotals = drawTotals(doc, data, afterTable);
    drawNotes(doc, data, afterTotals);
    drawFooter(doc);

    doc.end();
  });
}
