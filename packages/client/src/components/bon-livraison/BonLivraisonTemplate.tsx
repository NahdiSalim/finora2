import type { BonLivraison } from "src/types/bon-livraison";

const formatAmount = (value: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + " DT";

const statusLabels: Record<string, string> = {
  en_attente: "EN ATTENTE",
  livre: "LIVRÉ",
  annule: "ANNULÉ",
};

export const buildBonLivraisonTemplate = (bl: BonLivraison): string => {
  const recipientLines: string[] = [];
  if (bl.supplier) {
    if (bl.supplier.name) recipientLines.push(bl.supplier.name);
    if (bl.supplier.company) recipientLines.push(bl.supplier.company);
    if (bl.supplier.address) recipientLines.push(bl.supplier.address);
    if (bl.supplier.email) recipientLines.push("Email : " + bl.supplier.email);
    if (bl.supplier.phone) recipientLines.push("Tél : " + bl.supplier.phone);
    if (bl.supplier.taxId)
      recipientLines.push("Matricule : " + bl.supplier.taxId);
  }

  const lineItemsHtml = bl.lines
    .map(
      (line) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px 8px; font-size: 12px; width: 45%; word-wrap: break-word;">${line.description}</td>
        <td style="padding: 12px 8px; text-align: center; font-size: 12px; width: 20%; white-space: nowrap;">${formatAmount(line.unitPrice)}</td>
        <td style="padding: 12px 8px; text-align: center; font-size: 12px; width: 15%;">${line.quantity}</td>
        <td style="padding: 12px 8px; text-align: right; font-weight: bold; font-size: 12px; width: 20%; white-space: nowrap;">${formatAmount(line.quantity * line.unitPrice)}</td>
      </tr>`,
    )
    .join("");

  const statusLabel = statusLabels[bl.status] ?? bl.status.toUpperCase();
  const statusColor =
    bl.status === "livre"
      ? { bg: "#d1fae5", text: "#065f46" }
      : bl.status === "annule"
        ? { bg: "#fee2e2", text: "#991b1b" }
        : { bg: "#fff7ed", text: "#92400e" };

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <title>Bon de Livraison ${bl.number}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;800&display=swap');
            body {
              font-family: 'Montserrat', 'Helvetica Neue', Helvetica, Arial, sans-serif;
              color: #111827;
              margin: 0;
              padding: 40px;
              line-height: 1.5;
              font-size: 12px;
            }
            .bold  { font-weight: 700; }
            .heavy { font-weight: 800; }
            .page-container { max-width: 800px; margin: 0 auto; }
            @media print {
              body { padding: 20px; }
              .page-break { page-break-after: always; }
            }
        </style>
    </head>
    <body>
      <div class="page-container">

        <!-- Header -->
        <table style="width: 100%; margin-bottom: 30px; border-collapse: collapse;">
          <tr>
            <td style="width: 40%; vertical-align: middle;">
              <div style="font-size: 20px; font-weight: 700; color: #111827;">BON DE LIVRAISON</div>
            </td>
            <td style="width: 60%; text-align: right; vertical-align: middle;">
              <h1 class="heavy" style="font-size: 38px; text-transform: uppercase; margin: 0; padding: 0; line-height: 1;">BL</h1>
              <div style="margin-top: 6px;">
                <span style="display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: 700;
                  background: ${statusColor.bg}; color: ${statusColor.text};">
                  ${statusLabel}
                </span>
              </div>
            </td>
          </tr>
        </table>

        <!-- Dates and Number -->
        <table style="width: 100%; margin-bottom: 20px; font-size: 13px; border-collapse: collapse;">
          <tr>
            <td style="width: 50%; vertical-align: top;">
              <div><span class="bold">DATE :</span> ${new Date(bl.createdAt).toLocaleDateString("fr-FR")}</div>
              <div><span class="bold">DATE DE LIVRAISON :</span> ${new Date(bl.deliveryDate).toLocaleDateString("fr-FR")}</div>
            </td>
            <td style="width: 50%; text-align: right; vertical-align: top;">
              <div class="bold" style="font-size: 15px;">BL N° : ${bl.number}</div>
            </td>
          </tr>
        </table>

        <!-- Divider -->
        <div style="border-top: 2px solid #333; margin-bottom: 25px;"></div>

        <!-- Recipient -->
        <table style="width: 100%; margin-bottom: 40px; font-size: 12px; border-collapse: collapse;">
          <tr>
            <td style="width: 50%; vertical-align: top; padding-right: 20px;"></td>
            <td style="width: 50%; vertical-align: top; text-align: right; padding-left: 20px;">
              <div class="bold" style="text-transform: uppercase; margin-bottom: 8px; font-size: 11px; letter-spacing: 0.5px;">FOURNISSEUR :</div>
              ${
                recipientLines.length > 0
                  ? recipientLines
                      .map(
                        (line, i) =>
                          `<div ${i === 0 ? 'class="bold" style="font-size: 14px; margin-bottom: 4px;"' : 'style="margin-bottom: 2px;"'}>${line}</div>`,
                      )
                      .join("")
                  : '<div style="color: #9ca3af; font-style: italic;">Aucun fournisseur</div>'
              }
            </td>
          </tr>
        </table>

        <!-- Product Lines -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="border-bottom: 2px solid #333;">
              <th class="bold" style="text-align: left; padding: 10px 8px; font-size: 12px; width: 45%;">Description :</th>
              <th class="bold" style="text-align: center; padding: 10px 8px; font-size: 12px; width: 20%;">Prix Unitaire :</th>
              <th class="bold" style="text-align: center; padding: 10px 8px; font-size: 12px; width: 15%;">Quantité :</th>
              <th class="bold" style="text-align: right; padding: 10px 8px; font-size: 12px; width: 20%;">Total :</th>
            </tr>
          </thead>
          <tbody>${lineItemsHtml}</tbody>
        </table>

        <!-- Totals -->
        <table style="width: 100%; margin-bottom: 30px; border-collapse: collapse;">
          <tr>
            <td style="width: 55%; vertical-align: top; padding-right: 20px; font-size: 12px;">
              <div class="bold" style="text-transform: uppercase; margin-bottom: 10px; font-size: 13px; letter-spacing: 0.5px;">INFORMATIONS :</div>
              <div style="margin-top: 10px; font-size: 10px; color: #6b7280; line-height: 1.4;">
                Livraison prévue le ${new Date(bl.deliveryDate).toLocaleDateString("fr-FR")}.<br/>
                Veuillez vérifier la conformité des articles à la réception.
              </div>
            </td>
            <td style="width: 45%; vertical-align: top; text-align: right; padding-left: 20px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                  <td class="bold" style="padding: 6px 0; text-align: right; padding-right: 15px;">TOTAL HT :</td>
                  <td style="padding: 6px 0; text-align: right; white-space: nowrap;">${formatAmount(bl.amountHT)}</td>
                </tr>
                <tr>
                  <td class="bold" style="padding: 6px 0; text-align: right; padding-right: 15px;">TVA (${bl.tvaRate}%) :</td>
                  <td style="padding: 6px 0; text-align: right; white-space: nowrap;">${formatAmount(bl.amountTVA)}</td>
                </tr>
                <tr style="border-top: 2px solid #333;">
                  <td class="bold" style="padding: 12px 0 6px 0; text-align: right; padding-right: 15px; font-size: 15px;">TOTAL TTC :</td>
                  <td class="heavy" style="padding: 12px 0 6px 0; text-align: right; font-size: 17px; white-space: nowrap;">${formatAmount(bl.amountTTC)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        ${
          bl.notes
            ? `<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #6b7280; line-height: 1.5;">
            <p style="margin: 0;"><strong style="color: #111827;">Note :</strong> ${bl.notes}</p>
          </div>`
            : ""
        }

      </div>
    </body>
    </html>
  `;
};
