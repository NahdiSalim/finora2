import type { Facture, FactureCompany } from "src/types/facture";

const formatAmount = (value: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + " DT";

const WEBSITE_LOGO_URL = "/assets/logo-finora.png";

export const buildFactureTemplate = (facture: Facture): string => {
  const co: FactureCompany | null = facture.company ?? null;

  // Build issuer lines from company data, skipping nulls
  const issuerLines = [
    co?.legalName ?? co?.name ?? null,
    co?.phone ?? null,
    co?.email ?? null,
    co?.address ?? null,
    [co?.postalCode, co?.city].filter(Boolean).join(" ") || null,
  ].filter(Boolean) as string[];

  // Build recipient lines from clientName / clientAddress
  const recipientLines = [
    facture.clientName ?? null,
    facture.clientAddress ?? null,
  ].filter(Boolean) as string[];
  const lineItemsHtml = facture.lines
    .map(
      (line) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px 8px; font-size: 12px; width: 45%; word-wrap: break-word;">${line.description}</td>
        <td style="padding: 12px 8px; text-align: center; font-size: 12px; width: 20%; white-space: nowrap;">${formatAmount(line.unitPrice)}</td>
        <td style="padding: 12px 8px; text-align: center; font-size: 12px; width: 15%;">${line.quantity}</td>
        <td style="padding: 12px 8px; text-align: right; font-weight: bold; font-size: 12px; width: 20%; white-space: nowrap;">${formatAmount(line.quantity * line.unitPrice)}</td>
      </tr>
    `,
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <title>Facture ${facture.number}</title>
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
            .bold { font-weight: 700; }
            .heavy { font-weight: 800; }
            .page-container {
              max-width: 800px;
              margin: 0 auto;
            }
            @media print {
              body { padding: 20px; }
              .page-break { page-break-after: always; }
            }
        </style>
    </head>
    <body>
      <div class="page-container">
        
        <!-- Header with Logo and Title -->
        <table style="width: 100%; margin-bottom: 30px; border-collapse: collapse;">
          <tr>
            <td style="width: 40%; vertical-align: middle;">
              <img src="${WEBSITE_LOGO_URL}" alt="Finora Logo" style="height: 50px; max-width: 200px;" />
            </td>
            <td style="width: 60%; text-align: right; vertical-align: middle;">
              <h1 class="heavy" style="font-size: 48px; text-transform: uppercase; margin: 0; padding: 0; line-height: 1;">FACTURE</h1>
            </td>
          </tr>
        </table>

        <!-- Date and Invoice Number -->
        <table style="width: 100%; margin-bottom: 20px; font-size: 13px; border-collapse: collapse;">
          <tr>
            <td style="width: 50%; vertical-align: top;">
              <div><span class="bold">DATE :</span> ${new Date(facture.createdAt).toLocaleDateString("fr-FR")}</div>
              <div><span class="bold">ÉCHÉANCE :</span> ${new Date(facture.dueDate).toLocaleDateString("fr-FR")}</div>
            </td>
            <td style="width: 50%; text-align: right; vertical-align: top;">
              <div class="bold" style="font-size: 15px;">FACTURE N° : ${facture.number}</div>
            </td>
          </tr>
        </table>

        <!-- Divider -->
        <div style="border-top: 2px solid #333; margin-bottom: 25px;"></div>

        <!-- Issuer and Recipient -->
        <table style="width: 100%; margin-bottom: 40px; font-size: 12px; border-collapse: collapse;">
          <tr>
            <td style="width: 50%; vertical-align: top; padding-right: 20px;">
              <div class="bold" style="text-transform: uppercase; margin-bottom: 8px; font-size: 11px; letter-spacing: 0.5px;">ÉMETTEUR :</div>
              ${issuerLines
                .map(
                  (line, i) =>
                    `<div ${i === 0 ? 'class="bold" style="font-size: 14px; margin-bottom: 4px;"' : 'style="margin-bottom: 2px;"'}>${line}</div>`,
                )
                .join("")}
            </td>
            
            <td style="width: 50%; vertical-align: top; text-align: right; padding-left: 20px;">
              <div class="bold" style="text-transform: uppercase; margin-bottom: 8px; font-size: 11px; letter-spacing: 0.5px;">DESTINATAIRE :</div>
              ${recipientLines
                .map(
                  (line, i) =>
                    `<div ${i === 0 ? 'class="bold" style="font-size: 14px; margin-bottom: 4px;"' : 'style="margin-bottom: 2px;"'}>${line}</div>`,
                )
                .join("")}
            </td>
          </tr>
        </table>

        <!-- Product Lines Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="border-bottom: 2px solid #333;">
              <th class="bold" style="text-align: left; padding: 10px 8px; font-size: 12px; width: 45%;">Description :</th>
              <th class="bold" style="text-align: center; padding: 10px 8px; font-size: 12px; width: 20%;">Prix Unitaire :</th>
              <th class="bold" style="text-align: center; padding: 10px 8px; font-size: 12px; width: 15%;">Quantité :</th>
              <th class="bold" style="text-align: right; padding: 10px 8px; font-size: 12px; width: 20%;">Total :</th>
            </tr>
          </thead>
          <tbody>
            ${lineItemsHtml}
          </tbody>
        </table>

        <!-- Payment Info and Totals -->
        <table style="width: 100%; margin-bottom: 30px; border-collapse: collapse;">
          <tr>
            <td style="width: 55%; vertical-align: top; padding-right: 20px; font-size: 12px;">
              <div class="bold" style="text-transform: uppercase; margin-bottom: 10px; font-size: 13px; letter-spacing: 0.5px;">RÈGLEMENT :</div>
              <div class="bold" style="margin-bottom: 5px;">Par virement bancaire :</div>
              <div style="margin-top: 15px; font-size: 10px; color: #6b7280; line-height: 1.4;">
                En cas de retard de paiement, une indemnité de 10% par jour de retard ainsi que des frais de recouvrement de 40 euros seront exigibles.
              </div>
            </td>

            <td style="width: 45%; vertical-align: top; text-align: right; padding-left: 20px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                  <td class="bold" style="padding: 6px 0; text-align: right; padding-right: 15px;">TOTAL HT :</td>
                  <td style="padding: 6px 0; text-align: right; white-space: nowrap;">${formatAmount(facture.amountHT)}</td>
                </tr>
                <tr>
                  <td class="bold" style="padding: 6px 0; text-align: right; padding-right: 15px;">TVA (${facture.tvaRate}%) :</td>
                  <td style="padding: 6px 0; text-align: right; white-space: nowrap;">${formatAmount(facture.amountTVA)}</td>
                </tr>
                ${
                  facture.discountAmount != null && facture.discountAmount > 0
                    ? `
                <tr>
                  <td class="bold" style="padding: 6px 0; text-align: right; padding-right: 15px;">REMISE${facture.discountType === "percentage" ? ` (${facture.discountValue}%)` : ""} :</td>
                  <td style="padding: 6px 0; text-align: right; white-space: nowrap;">– ${formatAmount(facture.discountAmount)}</td>
                </tr>`
                    : ""
                }
                <tr style="border-top: 2px solid #333;">
                  <td class="bold" style="padding: 12px 0 6px 0; text-align: right; padding-right: 15px; font-size: 15px;">TOTAL TTC :</td>
                  <td class="heavy" style="padding: 12px 0 6px 0; text-align: right; font-size: 17px; white-space: nowrap;">${formatAmount(facture.amountTTC)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Footer Notes -->
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #6b7280; line-height: 1.5;">
          <p style="margin: 0 0 8px 0;"><strong style="color: #111827;">Note :</strong> ${facture.notes || "-"}</p>
          <p style="margin: 0;">Conditions générales de vente consultables sur le site : www.reallygreatsite.com</p>
        </div>

      </div>
    </body>
    </html>
  `;
};
