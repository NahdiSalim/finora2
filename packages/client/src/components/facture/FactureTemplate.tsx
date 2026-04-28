import type { Facture } from "src/types/facture";
import {
  type TemplateRenderId,
  resolveInvoiceTemplate,
} from "src/types/invoice-templates";

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n) + " DT";

const num = (f: Facture) => f.invoiceNumber ?? f.number ?? "N/A";

function issuerLines(f: Facture): string[] {
  const r: string[] = [];
  if (!f.company) return r;
  const c = f.company;
  if (c.legalName || c.name) r.push((c.legalName || c.name)!);
  if (c.address) r.push(c.address);
  if (c.city || c.postalCode)
    r.push([c.postalCode, c.city].filter(Boolean).join(" "));
  if (c.phone) r.push("Tel : " + c.phone);
  if (c.email) r.push(c.email);
  if (c.vatNumber) r.push("N TVA : " + c.vatNumber);
  return r;
}

function recipientLines(f: Facture): string[] {
  const r: string[] = [];
  if (!f.supplier) return r;
  const s = f.supplier;
  if (s.name) r.push(s.name);
  if (s.company) r.push(s.company);
  if (s.address) r.push(s.address);
  if (s.email) r.push("Email : " + s.email);
  if (s.phone) r.push("Tel : " + s.phone);
  if (s.taxId) r.push("Matricule : " + s.taxId);
  return r;
}

// ─── Classique ────────────────────────────────────────────────────────────────
// Rendu de référence — ne pas modifier.

function buildClassiqueTemplate(f: Facture): string {
  const il = issuerLines(f);
  const rl = recipientLines(f);
  const logo = f.company?.logoUrl;
  const name = f.company?.legalName || f.company?.name || "Emetteur";
  const logoHtml = logo
    ? '<img src="' +
      logo +
      '" alt="' +
      name +
      '" style="height:50px;max-width:200px;object-fit:contain"/>'
    : '<div style="font-size:20px;font-weight:700;color:#111827">' +
      name +
      "</div>";
  const ht = f.subtotal ?? f.amountHT ?? 0;
  const tva = f.vatAmount ?? f.amountTVA ?? 0;
  const ttc = f.total ?? f.amountTTC ?? 0;
  const rate = f.vatRate ?? f.tvaRate ?? 0;

  return (
    '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">' +
    "<title>Facture " +
    num(f) +
    "</title>" +
    "<style>" +
    "body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#111827;margin:0;padding:40px;line-height:1.5;font-size:12px}" +
    ".bold{font-weight:700}.heavy{font-weight:800}" +
    ".page-container{max-width:800px;margin:0 auto}" +
    "@media print{body{padding:20px}}" +
    '</style></head><body><div class="page-container">' +
    '<table style="width:100%;margin-bottom:30px;border-collapse:collapse"><tr>' +
    '<td style="width:40%;vertical-align:middle">' +
    logoHtml +
    "</td>" +
    '<td style="width:60%;text-align:right;vertical-align:middle"><h1 class="heavy" style="font-size:48px;text-transform:uppercase;margin:0;line-height:1">FACTURE</h1></td>' +
    "</tr></table>" +
    '<table style="width:100%;margin-bottom:20px;font-size:13px;border-collapse:collapse"><tr>' +
    '<td style="width:50%;vertical-align:top">' +
    '<div><span class="bold">DATE :</span> ' +
    new Date(f.createdAt).toLocaleDateString("fr-FR") +
    "</div>" +
    '<div><span class="bold">ECHEANCE :</span> ' +
    new Date(f.dueDate).toLocaleDateString("fr-FR") +
    "</div>" +
    "</td>" +
    '<td style="width:50%;text-align:right;vertical-align:top"><div class="bold" style="font-size:15px">FACTURE N : ' +
    num(f) +
    "</div></td>" +
    "</tr></table>" +
    '<div style="border-top:2px solid #333;margin-bottom:25px"></div>' +
    '<table style="width:100%;margin-bottom:40px;font-size:12px;border-collapse:collapse"><tr>' +
    '<td style="width:50%;vertical-align:top;padding-right:20px">' +
    '<div class="bold" style="text-transform:uppercase;margin-bottom:8px;font-size:11px;letter-spacing:0.5px">EMETTEUR :</div>' +
    il
      .map(
        (l, i) =>
          "<div " +
          (i === 0
            ? 'class="bold" style="font-size:14px;margin-bottom:4px"'
            : 'style="margin-bottom:2px"') +
          ">" +
          l +
          "</div>",
      )
      .join("") +
    "</td>" +
    '<td style="width:50%;vertical-align:top;text-align:right;padding-left:20px">' +
    '<div class="bold" style="text-transform:uppercase;margin-bottom:8px;font-size:11px;letter-spacing:0.5px">DESTINATAIRE :</div>' +
    rl
      .map(
        (l, i) =>
          "<div " +
          (i === 0
            ? 'class="bold" style="font-size:14px;margin-bottom:4px"'
            : 'style="margin-bottom:2px"') +
          ">" +
          l +
          "</div>",
      )
      .join("") +
    "</td></tr></table>" +
    '<table style="width:100%;border-collapse:collapse;margin-bottom:30px">' +
    '<thead><tr style="border-bottom:2px solid #333">' +
    '<th class="bold" style="text-align:left;padding:10px 8px;font-size:12px;width:45%">Description :</th>' +
    '<th class="bold" style="text-align:center;padding:10px 8px;font-size:12px;width:20%">Prix Unitaire :</th>' +
    '<th class="bold" style="text-align:center;padding:10px 8px;font-size:12px;width:15%">Quantite :</th>' +
    '<th class="bold" style="text-align:right;padding:10px 8px;font-size:12px;width:20%">Total :</th>' +
    "</tr></thead><tbody>" +
    f.lines
      .map(
        (l) =>
          '<tr style="border-bottom:1px solid #e5e7eb">' +
          '<td style="padding:12px 8px;font-size:12px;width:45%">' +
          l.description +
          "</td>" +
          '<td style="padding:12px 8px;text-align:center;font-size:12px;width:20%">' +
          fmt(l.unitPrice) +
          "</td>" +
          '<td style="padding:12px 8px;text-align:center;font-size:12px;width:15%">' +
          l.quantity +
          "</td>" +
          '<td style="padding:12px 8px;text-align:right;font-weight:bold;font-size:12px;width:20%">' +
          fmt(l.quantity * l.unitPrice) +
          "</td>" +
          "</tr>",
      )
      .join("") +
    "</tbody></table>" +
    '<table style="width:100%;margin-bottom:30px;border-collapse:collapse"><tr>' +
    '<td style="width:55%;vertical-align:top;padding-right:20px;font-size:12px">' +
    '<div class="bold" style="text-transform:uppercase;margin-bottom:10px;font-size:13px;letter-spacing:0.5px">REGLEMENT :</div>' +
    '<div class="bold" style="margin-bottom:5px">Par virement bancaire :</div>' +
    '<div style="margin-top:15px;font-size:10px;color:#6b7280;line-height:1.4">En cas de retard de paiement, une indemnite de 10% par jour de retard sera exigible.</div>' +
    "</td>" +
    '<td style="width:45%;vertical-align:top;text-align:right;padding-left:20px">' +
    '<table style="width:100%;border-collapse:collapse;font-size:13px">' +
    '<tr><td class="bold" style="padding:6px 0;text-align:right;padding-right:15px">TOTAL HT :</td><td style="padding:6px 0;text-align:right;white-space:nowrap">' +
    fmt(ht) +
    "</td></tr>" +
    '<tr><td class="bold" style="padding:6px 0;text-align:right;padding-right:15px">TVA (' +
    rate +
    '%) :</td><td style="padding:6px 0;text-align:right;white-space:nowrap">' +
    fmt(tva) +
    "</td></tr>" +
    (f.discountAmount != null && f.discountAmount > 0
      ? '<tr><td class="bold" style="padding:6px 0;text-align:right;padding-right:15px">REMISE :</td><td style="padding:6px 0;text-align:right;white-space:nowrap">- ' +
        fmt(f.discountAmount) +
        "</td></tr>"
      : "") +
    '<tr style="border-top:2px solid #333"><td class="bold" style="padding:12px 0 6px 0;text-align:right;padding-right:15px;font-size:15px">TOTAL TTC :</td>' +
    '<td class="heavy" style="padding:12px 0 6px 0;text-align:right;font-size:17px;white-space:nowrap">' +
    fmt(ttc) +
    "</td></tr>" +
    "</table></td></tr></table>" +
    (f.notes
      ? '<div style="margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:10px;color:#6b7280;line-height:1.5"><p style="margin:0"><strong style="color:#111827">Note :</strong> ' +
        f.notes +
        "</p></div>"
      : "") +
    "</div></body></html>"
  );
}

// ─── Moderne ──────────────────────────────────────────────────────────────────
// body{padding:0} — full-width bands sit at root, .content wrapper provides 40px lateral padding.
// ZERO overflow:hidden / ZERO float layout / ZERO fixed-width containers.
// Totaux : table uniquement (label-td + valeur-td).

function buildModerneTemplate(f: Facture): string {
  const il = issuerLines(f);
  const rl = recipientLines(f);
  const name = f.company?.legalName || f.company?.name || "Emetteur";
  const logo = f.company?.logoUrl;
  const logoHtml = logo
    ? '<img src="' +
      logo +
      '" alt="' +
      name +
      '" style="height:50px;max-width:200px;object-fit:contain"/>'
    : '<span style="color:rgba(255,255,255,0.9);font-size:16px;font-weight:700">' +
      name +
      "</span>";
  const ht = f.subtotal ?? f.amountHT ?? 0;
  const tva = f.vatAmount ?? f.amountTVA ?? 0;
  const ttc = f.total ?? f.amountTTC ?? 0;
  const rate = f.vatRate ?? f.tvaRate ?? 0;

  const discountRowHtml =
    f.discountAmount != null && f.discountAmount > 0
      ? "<tr>" +
        '<td style="padding:4px 16px 4px 0;text-align:right;color:#6366f1;font-size:12px">Remise' +
        (f.discountType === "percentage" ? " (" + f.discountValue + "%)" : "") +
        "</td>" +
        '<td style="padding:4px 0;text-align:right;font-weight:600;font-size:12px;white-space:nowrap;color:#1e293b">- ' +
        fmt(f.discountAmount) +
        "</td>" +
        "</tr>"
      : "";

  return (
    '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">' +
    "<title>Facture " +
    num(f) +
    "</title>" +
    "<style>" +
    "*{box-sizing:border-box}" +
    "body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#1e293b;background:#f5f3ff;line-height:1.5;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    ".page{max-width:800px;margin:0 auto;background:#f5f3ff;width:100%}" +
    ".hdr{background:#4f46e5;width:100%;border-collapse:collapse;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    ".hdr td{padding:18px 40px;vertical-align:middle}" +
    ".meta{background:#3730a3;width:100%;border-collapse:collapse;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    ".meta td{padding:7px 40px;font-size:11px;color:rgba(255,255,255,0.8)}" +
    ".content{padding:24px 40px 40px 40px;width:100%}" +
    ".accent-wrap{border-left:4px solid #818cf8;padding-left:12px;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    ".parties{width:100%;border-collapse:collapse;margin-bottom:24px}" +
    ".plabel{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#6366f1;margin-bottom:6px}" +
    ".pname{font-size:13px;font-weight:700;color:#1e293b;margin-bottom:3px}" +
    ".pline{font-size:11px;color:#64748b;margin-bottom:2px}" +
    "table.lines{width:100%;border-collapse:collapse;margin-bottom:20px}" +
    "table.lines thead th{background:#4f46e5;color:#fff;padding:10px 12px;font-size:11px;font-weight:600;text-align:left;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    "table.lines tbody tr.odd{background:#eef2ff;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    "table.lines tbody tr.even{background:#ffffff}" +
    "table.lines tbody td{padding:10px 12px;font-size:12px;border-bottom:1px solid #e0e7ff}" +
    "table.totals{width:100%;border-collapse:collapse;margin-bottom:0}" +
    "table.totals td{padding:4px 0;font-size:12px;vertical-align:middle}" +
    "table.totals td.lbl{text-align:right;padding-right:16px;color:#64748b;white-space:nowrap}" +
    "table.totals td.val{text-align:right;font-weight:600;color:#1e293b;white-space:nowrap}" +
    "table.totals tr.sep td{border-top:1px solid #e0e7ff;padding-top:8px}" +
    "table.ttc-band{width:100%;border-collapse:collapse;background:#4f46e5;margin-top:10px;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    "table.ttc-band td{padding:10px 16px;color:#fff}" +
    ".notes{margin-top:24px;padding:12px 16px;background:#ede9fe;border-left:4px solid #6366f1;font-size:11px;color:#3730a3;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    "@media print{" +
    "body{background:#f5f3ff;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    ".hdr td{padding:18px 20px}.meta td{padding:7px 20px}.content{padding:20px}}" +
    '</style></head><body><div class="page">' +
    '<table class="hdr"><tr>' +
    '<td style="width:50%;vertical-align:middle">' +
    logoHtml +
    "</td>" +
    '<td style="width:50%;text-align:right;vertical-align:middle"><span style="color:#fff;font-size:32px;font-weight:900;letter-spacing:3px">FACTURE</span></td>' +
    "</tr></table>" +
    '<table class="meta"><tr>' +
    "<td>N\u00b0 " +
    num(f) +
    "</td>" +
    '<td style="text-align:right">Date : ' +
    new Date(f.createdAt).toLocaleDateString("fr-FR") +
    " &nbsp;|&nbsp; Ech\u00e9ance : " +
    new Date(f.dueDate).toLocaleDateString("fr-FR") +
    "</td>" +
    "</tr></table>" +
    '<div class="content"><div class="accent-wrap">' +
    '<table class="parties"><tr>' +
    '<td style="width:50%;vertical-align:top;padding-right:16px">' +
    '<div class="plabel">Emetteur</div>' +
    il
      .map(
        (l, i) =>
          '<div class="' + (i === 0 ? "pname" : "pline") + '">' + l + "</div>",
      )
      .join("") +
    "</td>" +
    '<td style="width:50%;vertical-align:top;padding-left:16px">' +
    '<div class="plabel">Destinataire</div>' +
    rl
      .map(
        (l, i) =>
          '<div class="' + (i === 0 ? "pname" : "pline") + '">' + l + "</div>",
      )
      .join("") +
    "</td>" +
    "</tr></table>" +
    '<table class="lines"><thead><tr>' +
    '<th style="width:45%">Description</th>' +
    '<th style="text-align:center;width:20%">Prix unit.</th>' +
    '<th style="text-align:center;width:15%">Qte</th>' +
    '<th style="text-align:right;width:20%">Total</th>' +
    "</tr></thead><tbody>" +
    f.lines
      .map(
        (l, i) =>
          '<tr class="' +
          (i % 2 === 0 ? "odd" : "even") +
          '">' +
          "<td>" +
          l.description +
          "</td>" +
          '<td style="text-align:center">' +
          fmt(l.unitPrice) +
          "</td>" +
          '<td style="text-align:center">' +
          l.quantity +
          "</td>" +
          '<td style="text-align:right;font-weight:600">' +
          fmt(l.quantity * l.unitPrice) +
          "</td>" +
          "</tr>",
      )
      .join("") +
    "</tbody></table>" +
    // Totaux — table uniquement, zero float, zero overflow:hidden
    '<table style="width:100%;border-collapse:collapse;margin-bottom:0">' +
    '<tr><td style="width:55%;vertical-align:top;padding-right:20px;font-size:12px;color:#64748b">' +
    '<strong style="color:#4f46e5;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Reglement</strong>' +
    '<div style="margin-top:6px;font-weight:700;color:#1e293b">Par virement bancaire</div>' +
    '<div style="margin-top:10px;font-size:10px;color:#94a3b8;line-height:1.5">En cas de retard de paiement, une indemnite de 10% par jour de retard sera exigible.</div>' +
    "</td>" +
    '<td style="width:45%;vertical-align:top">' +
    '<table class="totals"><tbody>' +
    '<tr><td class="lbl">Total HT</td><td class="val">' +
    fmt(ht) +
    "</td></tr>" +
    '<tr><td class="lbl">TVA (' +
    rate +
    '%)</td><td class="val">' +
    fmt(tva) +
    "</td></tr>" +
    discountRowHtml +
    "</tbody></table>" +
    '<table class="ttc-band"><tr>' +
    '<td style="font-weight:700;font-size:14px">Total TTC</td>' +
    '<td style="text-align:right;font-weight:800;font-size:16px;white-space:nowrap">' +
    fmt(ttc) +
    "</td>" +
    "</tr></table>" +
    "</td></tr></table>" +
    (f.notes
      ? '<div class="notes"><strong>Note :</strong> ' + f.notes + "</div>"
      : "") +
    "</div></div>" +
    "</div></body></html>"
  );
}

// ─── Elegante ─────────────────────────────────────────────────────────────────
// Fond creme #fdf8f0, accent or #c9a96e, serif Georgia.
// ZERO overflow:hidden / ZERO float layout / ZERO fixed-width containers.
// Totaux : table uniquement.

function buildEleganteTemplate(f: Facture): string {
  const il = issuerLines(f);
  const rl = recipientLines(f);
  const logo = f.company?.logoUrl;
  const name = f.company?.legalName || f.company?.name || "Emetteur";
  const ht = f.subtotal ?? f.amountHT ?? 0;
  const tva = f.vatAmount ?? f.amountTVA ?? 0;
  const ttc = f.total ?? f.amountTTC ?? 0;
  const rate = f.vatRate ?? f.tvaRate ?? 0;

  const discountRowHtml =
    f.discountAmount != null && f.discountAmount > 0
      ? "<tr>" +
        '<td style="padding:4px 16px 4px 0;text-align:right;color:#a0856d;font-size:12px">Remise' +
        (f.discountType === "percentage" ? " (" + f.discountValue + "%)" : "") +
        "</td>" +
        '<td style="padding:4px 0;text-align:right;font-weight:600;font-size:12px;white-space:nowrap;color:#1c1008">- ' +
        fmt(f.discountAmount) +
        "</td>" +
        "</tr>"
      : "";

  return (
    '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">' +
    "<title>Facture " +
    num(f) +
    "</title>" +
    "<style>" +
    "*{box-sizing:border-box}" +
    "body{font-family:Georgia,'Times New Roman',serif;color:#1c1008;margin:0;padding:0;font-size:12px;line-height:1.6;background:#fdf8f0;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    ".page{max-width:800px;margin:0 auto;background:#fdf8f0;width:100%}" +
    ".gold-bar{height:3px;background:#c9a96e;width:100%;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    ".inner{padding:32px 40px 40px 40px;width:100%}" +
    ".title-block{text-align:center;margin-bottom:6px}" +
    ".title-block h1{font-family:Georgia,serif;font-size:28px;font-weight:700;letter-spacing:6px;color:#1c1008;margin:0;padding:20px 0 8px 0}" +
    ".gold-line{width:120px;height:1px;background:#c9a96e;margin:0 auto 28px auto;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    ".parties-table{width:100%;border-collapse:collapse;margin-bottom:32px;font-size:12px}" +
    ".plabel{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#c9a96e;margin-bottom:6px}" +
    ".pname{font-weight:700;font-size:13px;margin-bottom:2px}" +
    ".pline{color:#6b5a3e;font-size:11px;margin-bottom:1px}" +
    ".gold-sep{height:1px;background:#c9a96e;margin-bottom:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    "table.lines{width:100%;border-collapse:collapse}" +
    "table.lines thead tr{background:#f5ede0;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    "table.lines thead th{padding:10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#c9a96e;text-align:left;border-bottom:1px solid #c9a96e}" +
    "table.lines thead th:last-child{text-align:right}" +
    "table.lines tbody td{padding:12px 10px;font-size:12px;border-bottom:1px solid #e8dcc8}" +
    "table.lines tbody td:last-child{text-align:right;font-weight:700}" +
    ".gold-sep2{height:1px;background:#c9a96e;margin:0 0 16px 0;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    // Totaux — table only, no float, no overflow:hidden
    "table.totals{width:100%;border-collapse:collapse}" +
    "table.totals td{padding:4px 0;font-size:12px;vertical-align:middle}" +
    "table.totals td.lbl{text-align:right;padding-right:16px;color:#a0856d;white-space:nowrap}" +
    "table.totals td.val{text-align:right;font-weight:600;color:#1c1008;white-space:nowrap}" +
    "table.ttc-band{width:100%;border-collapse:collapse;background:#c9a96e;margin-top:12px;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    "table.ttc-band td{padding:10px 16px;color:#fff}" +
    "@media print{" +
    "body{background:#fdf8f0;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    ".inner{padding:20px}}" +
    '</style></head><body><div class="page">' +
    '<div class="gold-bar"></div>' +
    '<div class="inner">' +
    (logo
      ? '<div style="text-align:center;padding-top:12px;margin-bottom:4px"><img src="' +
        logo +
        '" alt="' +
        name +
        '" style="height:50px;max-width:200px;object-fit:contain"/></div>'
      : "") +
    '<div class="title-block"><h1>FACTURE</h1></div>' +
    '<div class="gold-line"></div>' +
    '<table class="parties-table"><tr>' +
    '<td style="width:34%;vertical-align:top;padding-right:12px">' +
    '<div class="plabel">Emetteur</div>' +
    il
      .map(
        (l, i) =>
          '<div class="' + (i === 0 ? "pname" : "pline") + '">' + l + "</div>",
      )
      .join("") +
    "</td>" +
    '<td style="width:34%;vertical-align:top;padding-right:12px">' +
    '<div class="plabel">Destinataire</div>' +
    rl
      .map(
        (l, i) =>
          '<div class="' + (i === 0 ? "pname" : "pline") + '">' + l + "</div>",
      )
      .join("") +
    "</td>" +
    '<td style="width:32%;vertical-align:top;text-align:right">' +
    '<div class="plabel">Reference</div>' +
    '<div style="font-weight:700;font-size:14px;margin-bottom:2px">N\u00b0 ' +
    num(f) +
    "</div>" +
    '<div style="font-size:11px;color:#6b5a3e">' +
    new Date(f.createdAt).toLocaleDateString("fr-FR") +
    "</div>" +
    '<div style="font-size:11px;color:#6b5a3e">Ech. ' +
    new Date(f.dueDate).toLocaleDateString("fr-FR") +
    "</div>" +
    "</td>" +
    "</tr></table>" +
    '<div class="gold-sep"></div>' +
    '<table class="lines"><thead><tr>' +
    '<th style="width:45%">Description</th>' +
    '<th style="text-align:center;width:20%">Prix unit.</th>' +
    '<th style="text-align:center;width:15%">Qte</th>' +
    '<th style="width:20%">Total</th>' +
    "</tr></thead><tbody>" +
    f.lines
      .map(
        (l) =>
          "<tr><td>" +
          l.description +
          "</td>" +
          '<td style="text-align:center">' +
          fmt(l.unitPrice) +
          "</td>" +
          '<td style="text-align:center">' +
          l.quantity +
          "</td>" +
          '<td style="text-align:right;font-weight:700">' +
          fmt(l.quantity * l.unitPrice) +
          "</td></tr>",
      )
      .join("") +
    "</tbody></table>" +
    '<div class="gold-sep2"></div>' +
    // Totaux — table uniquement
    '<table style="width:100%;border-collapse:collapse">' +
    "<tr>" +
    '<td style="width:55%;vertical-align:top;padding-right:20px;font-size:12px">' +
    '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#c9a96e;margin-bottom:8px">Reglement</div>' +
    '<div style="font-weight:700;margin-bottom:4px">Par virement bancaire</div>' +
    '<div style="margin-top:10px;font-size:10px;color:#a0856d;font-style:italic;line-height:1.5">En cas de retard de paiement, une indemnite de 10% par jour de retard sera exigible.</div>' +
    "</td>" +
    '<td style="width:45%;vertical-align:top">' +
    '<table class="totals"><tbody>' +
    '<tr><td class="lbl">Total HT</td><td class="val">' +
    fmt(ht) +
    "</td></tr>" +
    '<tr><td class="lbl">TVA (' +
    rate +
    '%)</td><td class="val">' +
    fmt(tva) +
    "</td></tr>" +
    discountRowHtml +
    "</tbody></table>" +
    '<table class="ttc-band"><tr>' +
    '<td style="font-weight:700;font-size:14px">Total TTC</td>' +
    '<td style="text-align:right;font-weight:800;font-size:16px;white-space:nowrap">' +
    fmt(ttc) +
    "</td>" +
    "</tr></table>" +
    "</td>" +
    "</tr></table>" +
    (f.notes
      ? '<div style="margin-top:28px;font-size:11px;color:#6b5a3e;font-style:italic;border-top:1px solid #e8dcc8;padding-top:14px"><strong style="color:#1c1008">Note :</strong> ' +
        f.notes +
        "</div>"
      : "") +
    "</div></div></body></html>"
  );
}

// ─── Compacte ─────────────────────────────────────────────────────────────────
// Header navy #1e293b, sous-header #0f172a, bande total teal #0f766e.
// body{padding:0} — full-width bands at root, .inner wrapper for content.
// ZERO overflow:hidden / ZERO float layout.

function buildCompacteTemplate(f: Facture): string {
  const il = issuerLines(f);
  const rl = recipientLines(f);
  const name = f.company?.legalName || f.company?.name || "Emetteur";
  const logo = f.company?.logoUrl;
  const logoHtml = logo
    ? '<img src="' +
      logo +
      '" alt="' +
      name +
      '" style="height:50px;max-width:200px;object-fit:contain"/>'
    : '<span style="font-size:15px;font-weight:700;color:#e2e8f0">' +
      name +
      "</span>";
  const ht = f.subtotal ?? f.amountHT ?? 0;
  const tva = f.vatAmount ?? f.amountTVA ?? 0;
  const ttc = f.total ?? f.amountTTC ?? 0;
  const rate = f.vatRate ?? f.tvaRate ?? 0;

  return (
    '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">' +
    "<title>Facture " +
    num(f) +
    "</title>" +
    "<style>" +
    "*{box-sizing:border-box}" +
    "body{font-family:Arial,sans-serif;color:#1e293b;margin:0;padding:0;font-size:12px;line-height:1.5;background:#f1f5f9;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    ".page{max-width:800px;margin:0 auto;background:#f1f5f9;width:100%}" +
    ".hdr{background:#1e293b;width:100%;border-collapse:collapse;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    ".hdr td{padding:16px 40px;vertical-align:middle}" +
    ".sub-hdr{background:#0f172a;width:100%;border-collapse:collapse;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    ".sub-hdr td{padding:7px 40px;font-size:10px;color:#64748b}" +
    ".inner{padding:20px 40px 24px 40px;width:100%}" +
    ".parties{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:12px}" +
    ".plabel{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin-bottom:4px}" +
    ".pname{font-weight:700;color:#1e293b;margin-bottom:1px}" +
    ".pline{color:#64748b;margin-bottom:1px}" +
    "table.lines{width:100%;border-collapse:collapse;font-size:12px}" +
    "table.lines thead th{background:#334155;padding:8px 10px;font-size:10px;font-weight:600;text-align:left;color:#e2e8f0;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    "table.lines thead th:last-child{text-align:right}" +
    "table.lines tbody tr.odd{background:#f8fafc;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    "table.lines tbody tr.even{background:#fff}" +
    "table.lines tbody td{padding:7px 10px;border-bottom:1px solid #e2e8f0}" +
    "table.lines tbody td:last-child{text-align:right;font-weight:600}" +
    ".total-band{background:#0f766e;width:100%;border-collapse:collapse;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    ".total-band td{padding:12px 40px;color:#fff;vertical-align:top}" +
    "@media print{" +
    "body{background:#f1f5f9;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    ".inner{padding:20px}" +
    ".hdr td{padding:16px 20px}.sub-hdr td{padding:7px 20px}.total-band td{padding:12px 20px}}" +
    '</style></head><body><div class="page">' +
    '<table class="hdr"><tr>' +
    '<td style="width:50%;vertical-align:middle">' +
    logoHtml +
    "</td>" +
    '<td style="width:50%;text-align:right">' +
    '<div style="font-size:20px;font-weight:900;color:#e2e8f0;letter-spacing:2px">FACTURE</div>' +
    '<div style="font-size:11px;color:#94a3b8;margin-top:2px">N\u00b0 ' +
    num(f) +
    "</div>" +
    "</td>" +
    "</tr></table>" +
    '<table class="sub-hdr"><tr>' +
    "<td>Date : " +
    new Date(f.createdAt).toLocaleDateString("fr-FR") +
    "</td>" +
    '<td style="text-align:center">Ech\u00e9ance : ' +
    new Date(f.dueDate).toLocaleDateString("fr-FR") +
    "</td>" +
    '<td style="text-align:right">TVA : ' +
    rate +
    "%</td>" +
    "</tr></table>" +
    '<div class="inner">' +
    '<table class="parties"><tr>' +
    '<td style="width:50%;vertical-align:top;padding-right:12px">' +
    '<div class="plabel">Emetteur</div>' +
    il
      .map(
        (l, i) =>
          '<div class="' + (i === 0 ? "pname" : "pline") + '">' + l + "</div>",
      )
      .join("") +
    "</td>" +
    '<td style="width:50%;vertical-align:top;padding-left:12px">' +
    '<div class="plabel">Destinataire</div>' +
    rl
      .map(
        (l, i) =>
          '<div class="' + (i === 0 ? "pname" : "pline") + '">' + l + "</div>",
      )
      .join("") +
    "</td>" +
    "</tr></table>" +
    '<table class="lines"><thead><tr>' +
    '<th style="width:45%">Description</th>' +
    '<th style="text-align:center;width:20%">Prix unit.</th>' +
    '<th style="text-align:center;width:15%">Qte</th>' +
    '<th style="text-align:right;width:20%">Total</th>' +
    "</tr></thead><tbody>" +
    f.lines
      .map(
        (l, i) =>
          '<tr class="' +
          (i % 2 === 0 ? "odd" : "even") +
          '">' +
          "<td>" +
          l.description +
          "</td>" +
          '<td style="text-align:center">' +
          fmt(l.unitPrice) +
          "</td>" +
          '<td style="text-align:center">' +
          l.quantity +
          "</td>" +
          '<td style="text-align:right;font-weight:600">' +
          fmt(l.quantity * l.unitPrice) +
          "</td>" +
          "</tr>",
      )
      .join("") +
    "</tbody></table>" +
    "</div>" +
    // Bande total teal — table at root, naturally full-width
    '<table class="total-band"><tr>' +
    '<td style="width:55%">' +
    '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:rgba(255,255,255,0.6);margin-bottom:6px">Reglement</div>' +
    '<div style="font-weight:700;color:rgba(255,255,255,0.9)">Par virement bancaire</div>' +
    '<div style="margin-top:6px;font-size:10px;color:rgba(255,255,255,0.5);line-height:1.5">En cas de retard de paiement, une indemnite de 10% par jour de retard sera exigible.</div>' +
    "</td>" +
    '<td style="width:45%;text-align:right">' +
    '<table style="width:100%;border-collapse:collapse">' +
    '<tr><td style="padding:2px 0;text-align:right;padding-right:12px;color:rgba(255,255,255,0.7);font-size:12px">Total HT</td>' +
    '<td style="padding:2px 0;text-align:right;color:rgba(255,255,255,0.9);font-size:12px;white-space:nowrap">' +
    fmt(ht) +
    "</td></tr>" +
    '<tr><td style="padding:2px 0;text-align:right;padding-right:12px;color:rgba(255,255,255,0.7);font-size:12px">TVA (' +
    rate +
    "%)</td>" +
    '<td style="padding:2px 0;text-align:right;color:rgba(255,255,255,0.9);font-size:12px;white-space:nowrap">' +
    fmt(tva) +
    "</td></tr>" +
    (f.discountAmount != null && f.discountAmount > 0
      ? '<tr><td style="padding:2px 0;text-align:right;padding-right:12px;color:rgba(255,255,255,0.7);font-size:12px">Remise</td><td style="padding:2px 0;text-align:right;color:rgba(255,255,255,0.9);font-size:12px;white-space:nowrap">- ' +
        fmt(f.discountAmount) +
        "</td></tr>"
      : "") +
    '<tr style="border-top:1px solid rgba(255,255,255,0.25)">' +
    '<td style="padding:8px 12px 0 0;text-align:right;color:#fff;font-size:14px;font-weight:700">Total TTC</td>' +
    '<td style="padding:8px 0 0 0;text-align:right;color:#fff;font-size:18px;font-weight:800;white-space:nowrap">' +
    fmt(ttc) +
    "</td>" +
    "</tr></table>" +
    "</td></tr></table>" +
    (f.notes
      ? '<div style="padding:14px 40px;font-size:10px;color:#475569;border-top:1px solid #cbd5e1;background:#f8fafc"><strong>Note :</strong> ' +
        f.notes +
        "</div>"
      : "") +
    "</div></body></html>"
  );
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export const buildFactureTemplate = (facture: Facture): string => {
  const templateId: TemplateRenderId = resolveInvoiceTemplate(
    facture.company?.invoiceTemplate,
  );
  switch (templateId) {
    case "moderne":
      return buildModerneTemplate(facture);
    case "elegante":
      return buildEleganteTemplate(facture);
    case "compacte":
      return buildCompacteTemplate(facture);
    case "classic":
    default:
      return buildClassiqueTemplate(facture);
  }
};
