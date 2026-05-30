import { PrismaClient } from '@prisma/client';

type Line = { id: string; description: string; quantity: number; unitPrice: number };

function calcAmounts(lines: Line[], tvaRate: number) {
  const amountHT =
    Math.round(lines.reduce((acc, l) => acc + l.quantity * l.unitPrice, 0) * 100) / 100;
  const amountTVA = Math.round(((amountHT * tvaRate) / 100) * 100) / 100;
  const amountTTC = Math.round((amountHT + amountTVA) * 100) / 100;
  return { amountHT, amountTVA, amountTTC };
}

function calcInvoiceTotals(
  lines: { quantity: number; unitPrice: number }[],
  vatRate: number,
  discountType?: string | null,
  discountValue?: number | null
) {
  const subtotal =
    Math.round(lines.reduce((acc, l) => acc + l.quantity * l.unitPrice, 0) * 100) / 100;
  let discount = 0;
  if (discountType && discountValue && discountValue > 0) {
    discount =
      discountType === 'percentage'
        ? Math.round(((subtotal * discountValue) / 100) * 100) / 100
        : discountValue;
  }
  const afterDiscount = Math.max(subtotal - discount, 0);
  const vatAmount = Math.round(((afterDiscount * vatRate) / 100) * 100) / 100;
  const total = Math.round((afterDiscount + vatAmount) * 100) / 100;
  return { subtotal, discountAmount: discount, vatAmount, total };
}

function lineId(index: number) {
  return `line-${index + 1}`;
}

/**
 * Seeds finance demo data for client dashboard screenshots.
 */
export async function seedFinance(prisma: PrismaClient, force = false) {
  console.log('💰 Seeding finance data (fournisseurs, produits, devis, BC, BL, factures)...');

  const clientUser = await prisma.user.findUnique({
    where: { email: 'client@finora.com' },
    include: { company: true },
  });

  if (!clientUser?.companyId) {
    console.log('⚠️  Client user/company not found — run full seed first');
    return;
  }

  const companyId = clientUser.companyId;
  const ownerId = clientUser.id;

  if (force) {
    await prisma.invoicePayment.deleteMany({ where: { invoice: { companyId } } });
    await prisma.invoiceLine.deleteMany({ where: { invoice: { companyId } } });
    await prisma.invoice.deleteMany({ where: { companyId } });
    await prisma.bonLivraison.deleteMany({ where: { companyId } });
    await prisma.bonCommande.deleteMany({ where: { companyId } });
    await prisma.devis.deleteMany({ where: { companyId } });
    await prisma.product.deleteMany({ where: { companyId } });
    await prisma.supplier.deleteMany({ where: { companyId } });
    console.log('   Cleared existing finance records');
  } else {
    const existing = await prisma.supplier.count({ where: { companyId } });
    if (existing > 0) {
      console.log('⚠️  Finance data already exists — use seed:demo to replace');
      return;
    }
  }

  // ── Fournisseurs ────────────────────────────────────────────────────────────
  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        name: 'Karim Ben Salah',
        company: 'Tunisie Informatique SARL',
        email: 'contact@tunisie-info.tn',
        phone: '+216 71 240 500',
        address: "12 Rue de l'Industrie, Tunis",
        taxId: '1234567A/M/000',
        companyId,
      },
    }),
    prisma.supplier.create({
      data: {
        name: 'Leila Mansouri',
        company: 'Office Supplies Pro',
        email: 'ventes@office-supplies.tn',
        phone: '+216 71 310 220',
        address: 'Zone Industrielle Charguia, Ariana',
        taxId: '2345678B/M/000',
        companyId,
      },
    }),
    prisma.supplier.create({
      data: {
        name: 'Hichem Dridi',
        company: 'Cabinet Juridique Carthage',
        email: 'cabinet@juridique-carthage.tn',
        phone: '+216 71 780 100',
        address: '45 Avenue Habib Bourguiba, Tunis',
        taxId: '3456789C/M/000',
        companyId,
      },
    }),
    prisma.supplier.create({
      data: {
        name: 'Sonia Gharbi',
        company: 'Logistique Méditerranée',
        email: 'logistique@med-logistics.tn',
        phone: '+216 74 450 330',
        address: 'Port de Radès, Ben Arous',
        taxId: '4567890D/M/000',
        companyId,
      },
    }),
  ]);

  const [itSupplier, officeSupplier, legalSupplier, logisticsSupplier] = suppliers;

  // ── Produits / Services (catalogue ventes — commerce & distribution) ───────
  await prisma.product.createMany({
    data: [
      { name: "Huile d'olive extra vierge — bidon 5 L", unitPrice: 42.5, companyId },
      { name: 'Dates Deglet Nour — carton 10 kg', unitPrice: 68, companyId },
      { name: 'Semoule fine — sac 25 kg', unitPrice: 29.9, companyId },
      { name: 'Eau minérale — palette 48 bouteilles', unitPrice: 115, companyId },
      { name: 'Conserves tomates — lot 24 boîtes', unitPrice: 36, companyId },
      { name: "Carton d'emballage renforcé — lot 50", unitPrice: 78, companyId },
      { name: 'Livraison express régionale', unitPrice: 95, companyId },
      { name: 'Stockage entrepôt — forfait mensuel', unitPrice: 420, companyId },
    ],
  });

  const validUntil = new Date('2026-08-31');
  const deliveryDate = new Date('2026-04-15');

  // ── Devis ───────────────────────────────────────────────────────────────────
  const devisLines1: Line[] = [
    { id: lineId(0), description: 'Tenue comptable — Trimestre 1', quantity: 3, unitPrice: 850 },
    { id: lineId(1), description: 'Déclaration TVA T1', quantity: 1, unitPrice: 450 },
  ];
  const d1 = calcAmounts(devisLines1, 19);

  const devisLines2: Line[] = [
    { id: lineId(0), description: 'Audit fiscal prévisionnel', quantity: 1, unitPrice: 3200 },
    { id: lineId(1), description: 'Rapport de synthèse', quantity: 1, unitPrice: 600 },
  ];
  const d2 = calcAmounts(devisLines2, 19);

  const devisLines3: Line[] = [
    { id: lineId(0), description: 'Fournitures bureau — lot annuel', quantity: 2, unitPrice: 420 },
  ];
  const d3 = calcAmounts(devisLines3, 7);

  const devisLines4: Line[] = [
    {
      id: lineId(0),
      description: 'Conseil juridique — restructuration',
      quantity: 8,
      unitPrice: 180,
    },
  ];
  const d4 = calcAmounts(devisLines4, 19);

  const devisLines5: Line[] = [
    { id: lineId(0), description: 'Transport marchandises — lot Q1', quantity: 5, unitPrice: 350 },
    { id: lineId(1), description: 'Assurance transport', quantity: 1, unitPrice: 200 },
  ];
  const d5 = calcAmounts(devisLines5, 19);

  await prisma.devis.createMany({
    data: [
      {
        number: 'DEV-2026-001',
        status: 'en_attente',
        tvaRate: 19,
        validUntil,
        lines: devisLines1,
        notes: 'Devis valable 30 jours. Paiement à 30 jours fin de mois.',
        ...d1,
        ownerId,
        companyId,
        createdBy: ownerId,
        createdByCompanyId: companyId,
        supplierId: itSupplier.id,
      },
      {
        number: 'DEV-2026-002',
        status: 'accepte',
        tvaRate: 19,
        validUntil,
        lines: devisLines2,
        notes: "Mission d'audit — démarrage sous 15 jours ouvrés.",
        ...d2,
        ownerId,
        companyId,
        createdBy: ownerId,
        createdByCompanyId: companyId,
        supplierId: legalSupplier.id,
      },
      {
        number: 'DEV-2026-003',
        status: 'refuse',
        tvaRate: 7,
        validUntil,
        lines: devisLines3,
        notes: 'Proposition refusée — budget insuffisant.',
        ...d3,
        ownerId,
        companyId,
        createdBy: ownerId,
        createdByCompanyId: companyId,
        supplierId: officeSupplier.id,
      },
      {
        number: 'DEV-2026-004',
        status: 'facture',
        tvaRate: 19,
        validUntil,
        lines: devisLines4,
        notes: 'Devis converti en facture FAC-2026-003.',
        ...d4,
        ownerId,
        companyId,
        createdBy: ownerId,
        createdByCompanyId: companyId,
        supplierId: legalSupplier.id,
      },
      {
        number: 'DEV-2026-005',
        status: 'en_attente',
        tvaRate: 19,
        validUntil,
        lines: devisLines5,
        notes: 'Tarif négocié pour livraisons récurrentes.',
        ...d5,
        ownerId,
        companyId,
        createdBy: ownerId,
        createdByCompanyId: companyId,
        supplierId: logisticsSupplier.id,
      },
    ],
  });

  // ── Bons de commande ───────────────────────────────────────────────────────
  const bcLines1: Line[] = [
    { id: lineId(0), description: 'Licences logiciel comptable', quantity: 5, unitPrice: 240 },
    { id: lineId(1), description: 'Support technique annuel', quantity: 1, unitPrice: 600 },
  ];
  const bc1 = calcAmounts(bcLines1, 19);

  const bcLines2: Line[] = [
    {
      id: lineId(0),
      description: 'Matériel informatique — postes de travail',
      quantity: 3,
      unitPrice: 1850,
    },
  ];
  const bc2 = calcAmounts(bcLines2, 19);

  const bcLines3: Line[] = [
    {
      id: lineId(0),
      description: 'Prestation logistique — livraison Sfax',
      quantity: 2,
      unitPrice: 480,
    },
  ];
  const bc3 = calcAmounts(bcLines3, 19);

  await prisma.bonCommande.createMany({
    data: [
      {
        number: 'BC-2026-001',
        status: 'confirme',
        tvaRate: 19,
        validUntil,
        lines: bcLines1,
        notes: 'Commande confirmée — livraison sous 10 jours.',
        ...bc1,
        ownerId,
        companyId,
        createdBy: ownerId,
        createdByCompanyId: companyId,
        supplierId: itSupplier.id,
      },
      {
        number: 'BC-2026-002',
        status: 'brouillon',
        tvaRate: 19,
        validUntil,
        lines: bcLines2,
        notes: 'En attente de validation direction.',
        ...bc2,
        ownerId,
        companyId,
        createdBy: ownerId,
        createdByCompanyId: companyId,
        supplierId: itSupplier.id,
      },
      {
        number: 'BC-2026-003',
        status: 'confirme',
        tvaRate: 19,
        validUntil,
        lines: bcLines3,
        notes: 'Transport express demandé.',
        ...bc3,
        ownerId,
        companyId,
        createdBy: ownerId,
        createdByCompanyId: companyId,
        supplierId: logisticsSupplier.id,
      },
    ],
  });

  // ── Bons de livraison ───────────────────────────────────────────────────────
  const blLines1: Line[] = [
    { id: lineId(0), description: 'Licences logiciel comptable', quantity: 5, unitPrice: 240 },
    { id: lineId(1), description: 'Support technique annuel', quantity: 1, unitPrice: 600 },
  ];
  const bl1 = calcAmounts(blLines1, 19);

  const blLines2: Line[] = [
    {
      id: lineId(0),
      description: 'Prestation logistique — livraison Sfax',
      quantity: 2,
      unitPrice: 480,
    },
  ];
  const bl2 = calcAmounts(blLines2, 19);

  await prisma.bonLivraison.createMany({
    data: [
      {
        number: 'BL-2026-001',
        status: 'livre',
        tvaRate: 19,
        deliveryDate,
        lines: blLines1,
        notes: 'Réception conforme — bon signé le 12/04/2026.',
        ...bl1,
        ownerId,
        companyId,
        createdBy: ownerId,
        createdByCompanyId: companyId,
        supplierId: itSupplier.id,
      },
      {
        number: 'BL-2026-002',
        status: 'en_attente',
        tvaRate: 19,
        deliveryDate: new Date('2026-05-02'),
        lines: blLines2,
        notes: 'Livraison prévue semaine 18.',
        ...bl2,
        ownerId,
        companyId,
        createdBy: ownerId,
        createdByCompanyId: companyId,
        supplierId: logisticsSupplier.id,
      },
    ],
  });

  // ── Factures ────────────────────────────────────────────────────────────────
  const invLines1 = [
    { description: 'Tenue comptable — Janvier 2026', quantity: 1, unitPrice: 850 },
    { description: 'Déclaration TVA T4 2025', quantity: 1, unitPrice: 450 },
  ];
  const inv1 = calcInvoiceTotals(invLines1, 19);

  const invLines2 = [
    { description: 'Conseil juridique — restructuration', quantity: 8, unitPrice: 180 },
  ];
  const inv2 = calcInvoiceTotals(invLines2, 19);

  const invLines3 = [
    { description: 'Licences logiciel comptable', quantity: 5, unitPrice: 240 },
    { description: 'Support technique annuel', quantity: 1, unitPrice: 600 },
  ];
  const inv3 = calcInvoiceTotals(invLines3, 19, 'percentage', 5);

  const invLines4 = [
    { description: 'Gestion paie & CNSS — Mars 2026', quantity: 45, unitPrice: 120 },
  ];
  const inv4 = calcInvoiceTotals(invLines4, 19);

  const invLines5 = [
    { description: 'Établissement liasse fiscale 2025', quantity: 1, unitPrice: 1500 },
  ];
  const inv5 = calcInvoiceTotals(invLines5, 19);

  const invLines6 = [{ description: 'Fournitures bureau — lot Q1', quantity: 2, unitPrice: 420 }];
  const inv6 = calcInvoiceTotals(invLines6, 7);

  const invoicePayloads = [
    {
      number: 'FAC-2026-001',
      status: 'sent',
      lines: invLines1,
      totals: inv1,
      supplierId: itSupplier.id,
      dueDays: 30,
    },
    {
      number: 'FAC-2026-002',
      status: 'paid',
      lines: invLines2,
      totals: inv2,
      supplierId: legalSupplier.id,
      dueDays: 15,
      paid: true,
    },
    {
      number: 'FAC-2026-003',
      status: 'draft',
      lines: invLines3,
      totals: inv3,
      supplierId: itSupplier.id,
      dueDays: 30,
    },
    {
      number: 'FAC-2026-004',
      status: 'partial',
      lines: invLines4,
      totals: inv4,
      supplierId: itSupplier.id,
      dueDays: 30,
      partial: true,
    },
    {
      number: 'FAC-2026-005',
      status: 'overdue',
      lines: invLines5,
      totals: inv5,
      supplierId: legalSupplier.id,
      dueDays: -20,
    },
    {
      number: 'FAC-2026-006',
      status: 'sent',
      lines: invLines6,
      totals: inv6,
      supplierId: officeSupplier.id,
      dueDays: 45,
      vatRate: 7,
    },
  ] as const;

  for (const inv of invoicePayloads) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + inv.dueDays);
    const vatRate = 'vatRate' in inv ? inv.vatRate : 19;
    const amountPaid =
      'paid' in inv && inv.paid
        ? inv.totals.total
        : 'partial' in inv && inv.partial
          ? Math.round(inv.totals.total * 0.4 * 100) / 100
          : 0;

    await prisma.invoice.create({
      data: {
        invoiceNumber: inv.number,
        status: inv.status,
        dueDate,
        vatRate,
        discountType: inv.number === 'FAC-2026-003' ? 'percentage' : null,
        discountValue: inv.number === 'FAC-2026-003' ? 5 : null,
        subtotal: inv.totals.subtotal,
        discountAmount: inv.totals.discountAmount,
        vatAmount: inv.totals.vatAmount,
        total: inv.totals.total,
        amountPaid,
        remainingAmount: Math.round((inv.totals.total - amountPaid) * 100) / 100,
        notes:
          inv.status === 'overdue'
            ? 'Relance envoyée — échéance dépassée.'
            : inv.status === 'partial'
              ? 'Acompte de 40 % reçu.'
              : null,
        supplierId: inv.supplierId,
        companyId,
        createdById: ownerId,
        lines: {
          create: inv.lines.map((line, index) => ({
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            lineTotal: Math.round(line.quantity * line.unitPrice * 100) / 100,
            order: index,
          })),
        },
      },
    });
  }

  console.log('✅ Finance data seeded:');
  console.log(`   - ${suppliers.length} fournisseurs`);
  console.log('   - 8 produits/services');
  console.log('   - 5 devis (en attente, accepté, refusé, facturé)');
  console.log('   - 3 bons de commande');
  console.log('   - 2 bons de livraison');
  console.log('   - 6 factures (brouillon, envoyée, payée, partielle, en retard)');
}
