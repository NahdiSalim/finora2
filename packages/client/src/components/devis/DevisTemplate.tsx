import type { Devis } from "src/types/devis";

const formatAmount = (value: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + " DT";

const WEBSITE_LOGO_URL = "/assets/logo-finora.png";

const ISSUER_INFO = {
  name: "VOTRE NOM DE COMPAGNIE",
  phone: "123-456-7890",
  email: "hello@reallygreatsite.com",
  address: ["123 Anywhere St,", "Any City ST 12345"],
};

export const buildDevisTemplate = (devis: Devis): string => {
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
            @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&display=swap');
            @page {
              size: A4;
              margin: 10mm; /* Strict PDF margins */
            }
            body { 
              font-family: 'Montserrat', 'Helvetica Neue', Helvetica, Arial, sans-serif;
              color: #1f2937; /* Slightly darker text for print contrast */
              margin: 0;
              padding: 20px; /* Reduced from 40px */
              line-height: 1.4; /* Tighter line height */
              font-size: 11px; /* Base size reduced slightly */
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important; /* Ensure background colors print */
            }
            .bold { font-weight: 600; }
            .heavy { font-weight: 800; }
            .page-container {
              max-width: 800px;
              margin: 0 auto;
              height: 100%;
              box-sizing: border-box;
            }
            .section { margin-bottom: 20px; } /* Consistent tighter spacing between blocks */
        </style>
    </head>
    <body>
      <div class="page-container">
        
        <table class="section" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 40%; vertical-align: middle;">
              <img src="${WEBSITE_LOGO_URL}" alt="Finora Logo" style="height: 45px; max-width: 180px;" />
            </td>
            <td style="width: 60%; text-align: right; vertical-align: middle;">
              <h1 class="heavy" style="font-size: 36px; text-transform: uppercase; margin: 0; padding: 0; line-height: 1; color: #3B82F6;">DEVIS</h1>
            </td>
          </tr>
        </table>

        <table class="section" style="width: 100%; font-size: 12px; border-collapse: collapse;">
          <tr>
            <td style="width: 50%; vertical-align: top;">
              <div><span class="bold">DATE :</span> ${new Date(devis.createdAt).toLocaleDateString("fr-FR")}</div>
              <div><span class="bold">VALIDE JUSQU'AU :</span> ${new Date(devis.validUntil).toLocaleDateString("fr-FR")}</div>
            </td>
            <td style="width: 50%; text-align: right; vertical-align: top;">
              <div class="bold" style="font-size: 14px; margin-bottom: 4px;">DEVIS N° : ${devis.number}</div>
              <div style="display: inline-block; padding: 4px 12px; background-color: ${statusColors[devis.status]}; color: white; border-radius: 12px; font-size: 10px; font-weight: 700; letter-spacing: 0.5px;">
                ${statusLabels[devis.status]}
              </div>
            </td>
          </tr>
        </table>

        <div class="section" style="border-top: 2px solid #3B82F6;"></div>

        <table class="section" style="width: 100%; font-size: 11px; border-collapse: collapse;">
          <tr>
            <td style="width: 50%; vertical-align: top; padding-right: 15px;">
              <div class="bold" style="text-transform: uppercase; margin-bottom: 4px; font-size: 10px; letter-spacing: 0.5px; color: #3B82F6;">ÉMETTEUR :</div>
              <div class="bold" style="font-size: 13px; margin-bottom: 2px;">${ISSUER_INFO.name}</div>
              <div>${ISSUER_INFO.phone}</div>
              <div>${ISSUER_INFO.email}</div>
              <div>${ISSUER_INFO.address[0]} ${ISSUER_INFO.address[1]}</div>
            </td>
            
            <td style="width: 50%; vertical-align: top; text-align: right; padding-left: 15px;">
              <div class="bold" style="text-transform: uppercase; margin-bottom: 4px; font-size: 10px; letter-spacing: 0.5px; color: #3B82F6;">DESTINATAIRE :</div>
              <div class="bold" style="font-size: 13px; margin-bottom: 2px;">M. NOA ANDRIEUX</div>
              <div>hello@reallygreatsite.com</div>
              <div>123 Anywhere St, Any City ST 12345</div>
            </td>
          </tr>
        </table>

        <table class="section" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid #3B82F6; background-color: #f3f4f6;">
              <th class="bold" style="text-align: left; padding: 10px 8px; font-size: 11px; width: 45%;">Description :</th>
              <th class="bold" style="text-align: center; padding: 10px 8px; font-size: 11px; width: 20%;">Prix Unitaire :</th>
              <th class="bold" style="text-align: center; padding: 10px 8px; font-size: 11px; width: 15%;">Quantité :</th>
              <th class="bold" style="text-align: right; padding: 10px 8px; font-size: 11px; width: 20%;">Total :</th>
            </tr>
          </thead>
          <tbody>
            ${lineItemsHtml}
          </tbody>
        </table>

        <table class="section" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 55%; vertical-align: top; padding-right: 15px; font-size: 11px;">
              <div class="bold" style="text-transform: uppercase; margin-bottom: 6px; font-size: 11px; letter-spacing: 0.5px; color: #3B82F6;">CONDITIONS :</div>
              <div style="padding: 10px; background-color: #F3F4F6; border-left: 3px solid #3B82F6; border-radius: 4px; line-height: 1.4;">
                <div class="bold" style="margin-bottom: 4px;">Validité du devis :</div>
                <div style="margin-bottom: 8px; font-size: 10px; color: #374151;">
                  Valable jusqu'au ${new Date(devis.validUntil).toLocaleDateString("fr-FR")}.
                </div>
                <div class="bold" style="margin-bottom: 4px;">Modalités de paiement :</div>
                <div style="font-size: 10px; color: #374151;">
                  50% à la commande, solde à la livraison. (Virement ou chèque).
                </div>
              </div>
            </td>

            <td style="width: 45%; vertical-align: top; text-align: right; padding-left: 15px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 12px; background-color: #eff6ff; padding: 15px; border-radius: 6px; border: 1px solid #bfdbfe;">
                <tr>
                  <td class="bold" style="padding: 6px 0; text-align: right; padding-right: 15px; color: #374151;">TOTAL HT :</td>
                  <td style="padding: 6px 0; text-align: right; white-space: nowrap; font-weight: 600;">${formatAmount(devis.amountHT)}</td>
                </tr>
                <tr>
                  <td class="bold" style="padding: 6px 0; text-align: right; padding-right: 15px; color: #374151;">TVA (${devis.tvaRate}%) :</td>
                  <td style="padding: 6px 0; text-align: right; white-space: nowrap; font-weight: 600;">${formatAmount(devis.amountTVA)}</td>
                </tr>
                <tr style="border-top: 1px solid #3B82F6;">
                  <td class="bold" style="padding: 10px 0 4px 0; text-align: right; padding-right: 15px; font-size: 14px; color: #3B82F6;">TOTAL TTC :</td>
                  <td class="heavy" style="padding: 10px 0 4px 0; text-align: right; font-size: 16px; white-space: nowrap; color: #3B82F6;">${formatAmount(devis.amountTTC)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <div class="section" style="padding: 15px; background-color: #F9FAFB; border-radius: 6px; border: 1px solid #E5E7EB;">
          <div style="margin-bottom: 10px;">
            <span class="bold" style="color: #3B82F6; font-size: 11px;">NOTE :</span>
            <div style="margin-top: 4px; font-size: 10px; color: #374151; line-height: 1.4;">
              ${devis.notes || "Aucune note spécifique pour ce devis."}
            </div>
          </div>
          <div style="padding-top: 10px; border-top: 1px solid #E5E7EB; font-size: 9px; color: #6B7280; line-height: 1.4;">
            <div style="margin-bottom: 4px;">
              <span class="bold" style="color: #111827;">Acceptation :</span> Veuillez retourner ce document signé avec la mention "Bon pour accord".
            </div>
            <div>
              <span class="bold" style="color: #111827;">Contact :</span> ${ISSUER_INFO.phone} | ${ISSUER_INFO.email}
            </div>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 50%; vertical-align: top; padding-right: 15px;">
              <div style="border: 1px dashed #D1D5DB; padding: 15px; border-radius: 6px; min-height: 60px;">
                <div class="bold" style="margin-bottom: 6px; font-size: 10px; color: #6B7280;">SIGNATURE DU CLIENT</div>
                <div style="font-size: 9px; color: #9CA3AF;">Date et signature</div>
              </div>
            </td>
            <td style="width: 50%; vertical-align: top; padding-left: 15px;">
              <div style="border: 1px dashed #D1D5DB; padding: 15px; border-radius: 6px; min-height: 60px;">
                <div class="bold" style="margin-bottom: 6px; font-size: 10px; color: #6B7280;">SIGNATURE DE L'ÉMETTEUR</div>
                <div style="font-size: 9px; color: #9CA3AF;">Date et signature</div>
              </div>
            </td>
          </tr>
        </table>

      </div>
    </body>
    </html>
  `;
};
