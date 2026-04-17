import type { Devis } from "src/types/devis";

const formatAmount = (value: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + " DT";

export const buildDevisTemplate = (devis: Devis): string => {
  // TODO: Replace with actual company data when available
  const issuerLines = ["Votre Entreprise"].filter(Boolean) as string[];

  // TODO: Replace with actual client data when available
  const recipientLines = ["Client Name", "Adresse"].filter(Boolean) as string[];
  const lineItemsHtml = devis.lines
    .map(
      (line) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 8px; font-size: 11px; width: 45%; word-wrap: break-word;">${line.description}</td>
        <td style="padding: 8px; text-align: center; font-size: 11px; width: 20%; white-space: nowrap;">${formatAmount(line.unitPrice)}</td>
        <td style="padding: 8px; text-align: center; font-size: 11px; width: 15%;">${line.quantity}</td>
        <td style="padding: 8px; text-align: right; font-weight: bold; font-size: 11px; width: 20%; white-space: nowrap;">${formatAmount(line.quantity * line.unitPrice)}</td>
      </tr>
    `,
    )
    .join("");

  const statusLabels: Record<string, string> = {
    en_attente: "EN ATTENTE",
    accepte: "ACCEPTÉ",
    refuse: "REFUSÉ",
  };

  const statusColors: Record<string, string> = {
    en_attente: "#F59E0B",
    accepte: "#10B981",
    refuse: "#EF4444",
  };

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <title>Devis ${devis.number}</title>
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
              <table cellpadding="0" cellspacing="0" style="border: none;">
                <tr>
                  <td style="vertical-align: middle; padding-right: 12px;">
                    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style="display: block;">
                      <path d="M20.1424 0.843087L16.9853 0L14.3248 9.89565L11.9228 0.961791L8.76555 1.80488L11.3608 11.4573L4.8967 5.01518L2.58549 7.31854L9.67576 14.3848L0.845959 12.0269L0 15.1733L9.64767 17.7496C9.53721 17.2748 9.47877 16.7801 9.47877 16.2717C9.47877 12.6737 12.4055 9.75685 16.0159 9.75685C19.6262 9.75685 22.5529 12.6737 22.5529 16.2717C22.5529 16.7768 22.4952 17.2685 22.3861 17.7405L31.1541 20.0818L32 16.9354L22.314 14.3489L31.1444 11.9908L30.2984 8.84437L20.6128 11.4308L27.0768 4.98873L24.7656 2.68538L17.7737 9.65357L20.1424 0.843087Z" fill="#FF7D0D"/>
                      <path d="M22.3776 17.7769C22.1069 18.9173 21.5354 19.9419 20.7513 20.7628L27.1033 27.0933L29.4145 24.7899L22.3776 17.7769Z" fill="#FF7D0D"/>
                      <path d="M20.6871 20.8291C19.8936 21.6369 18.8907 22.2397 17.7661 22.5503L20.0775 31.1471L23.2346 30.304L20.6871 20.8291Z" fill="#FF7D0D"/>
                      <path d="M17.6481 22.5818C17.1264 22.7155 16.5795 22.7866 16.0159 22.7866C15.4121 22.7866 14.8273 22.705 14.2723 22.5522L11.9588 31.1569L15.1159 31.9999L17.6481 22.5818Z" fill="#FF7D0D"/>
                      <path d="M14.1607 22.5206C13.0533 22.1945 12.0683 21.584 11.2909 20.7739L4.92328 27.1199L7.23448 29.4233L14.1607 22.5206Z" fill="#FF7D0D"/>
                      <path d="M11.2378 20.718C10.4737 19.9028 9.91721 18.8919 9.65231 17.769L0.855743 20.1181L1.7017 23.2645L11.2378 20.718Z" fill="#FF7D0D"/>
                    </svg>
                  </td>
                  <td style="vertical-align: middle;">
                    <span style="font-size: 24px; font-weight: 600; color: #111827; letter-spacing: -0.02em; line-height: 1; white-space: nowrap;">FINORA</span>
                  </td>
                </tr>
              </table>
            </td>
            <td style="width: 60%; text-align: right; vertical-align: middle;">
              <h1 class="heavy" style="font-size: 48px; text-transform: uppercase; margin: 0; padding: 0; line-height: 1;">DEVIS</h1>
            </td>
          </tr>
        </table>

        <!-- Date and Devis Number -->
        <table style="width: 100%; margin-bottom: 20px; font-size: 13px; border-collapse: collapse;">
          <tr>
            <td style="width: 50%; vertical-align: top;">
              <div><span class="bold">DATE :</span> ${new Date(devis.createdAt).toLocaleDateString("fr-FR")}</div>
              <div><span class="bold">VALIDE JUSQU'AU :</span> ${new Date(devis.validUntil).toLocaleDateString("fr-FR")}</div>
            </td>
            <td style="width: 50%; text-align: right; vertical-align: top;">
              <div class="bold" style="font-size: 15px;">DEVIS N° : ${devis.number}</div>
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
              <div class="bold" style="text-transform: uppercase; margin-bottom: 10px; font-size: 13px; letter-spacing: 0.5px;">CONDITIONS :</div>
              <div class="bold" style="margin-bottom: 5px;">Modalités de paiement :</div>
              <div style="margin-top: 15px; font-size: 10px; color: #6b7280; line-height: 1.4;">
                50% à la commande, solde à la livraison. Paiement par virement bancaire ou chèque.
              </div>
            </td>

            <td style="width: 45%; vertical-align: top; text-align: right; padding-left: 20px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                  <td class="bold" style="padding: 6px 0; text-align: right; padding-right: 15px;">TOTAL HT :</td>
                  <td style="padding: 6px 0; text-align: right; white-space: nowrap;">${formatAmount(devis.amountHT)}</td>
                </tr>
                <tr>
                  <td class="bold" style="padding: 6px 0; text-align: right; padding-right: 15px;">TVA (${devis.tvaRate}%) :</td>
                  <td style="padding: 6px 0; text-align: right; white-space: nowrap;">${formatAmount(devis.amountTVA)}</td>
                </tr>
                ${
                  devis.discountValue != null && devis.discountValue > 0
                    ? `
                <tr>
                  <td class="bold" style="padding: 6px 0; text-align: right; padding-right: 15px;">REMISE${devis.discountType === "percentage" ? ` (${devis.discountValue}%)` : ""} :</td>
                  <td style="padding: 6px 0; text-align: right; white-space: nowrap;">– ${formatAmount(devis.discountType === "percentage" ? devis.amountHT * (devis.discountValue / 100) : devis.discountValue)}</td>
                </tr>`
                    : ""
                }
                <tr style="border-top: 2px solid #333;">
                  <td class="bold" style="padding: 12px 0 6px 0; text-align: right; padding-right: 15px; font-size: 15px;">TOTAL TTC :</td>
                  <td class="heavy" style="padding: 12px 0 6px 0; text-align: right; font-size: 17px; white-space: nowrap;">${formatAmount(devis.amountTTC)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Footer Notes -->
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #6b7280; line-height: 1.5;">
          <p style="margin: 0 0 8px 0;"><strong style="color: #111827;">Note :</strong> ${devis.notes || "-"}</p>
          <p style="margin: 0;">Ce devis est valable jusqu'au ${new Date(devis.validUntil).toLocaleDateString("fr-FR")}. Veuillez le retourner signé avec la mention "Bon pour accord".</p>
        </div>

      </div>
    </body>
    </html>
  `;
};
