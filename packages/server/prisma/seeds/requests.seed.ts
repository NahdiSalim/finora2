import { PrismaClient } from '@prisma/client';

export async function seedRequests(prisma: PrismaClient, force = false) {
  console.log('🔄 Seeding requests (demandes)...');

  const requestCount = await prisma.request.count();
  if (requestCount > 0 && !force) {
    console.log(
      '⚠️  Requests already exist, skipping requests seed (use FORCE_DEMO_SEED=true to replace)'
    );
    return;
  }

  if (force && requestCount > 0) {
    await prisma.request.deleteMany({});
    console.log('   Cleared existing requests');
  }

  const client = await prisma.user.findUnique({
    where: { email: 'client@finora.com' },
    include: { company: true },
  });

  const accountant = await prisma.user.findUnique({
    where: { email: 'comptable@finora.com' },
    include: { company: true },
  });

  if (!client?.companyId || !accountant?.companyId) {
    console.log('⚠️  Required users not found, skipping requests seed');
    return;
  }

  const accountingFirmId = accountant.companyId;

  const requests = [
    {
      subject: 'Déclaration TVA trimestrielle T1',
      topic: 'Fiscalité',
      description:
        'Merci de préparer et valider notre déclaration de TVA pour le premier trimestre 2026.',
      type: 'tax',
      urgency: 'high',
      status: 'pending',
      desiredResponseDate: '2026-04-15',
    },
    {
      subject: 'Rapprochement bancaire janvier',
      topic: 'Comptabilité',
      description:
        'Pouvez-vous effectuer le rapprochement entre nos relevés bancaires et le grand livre ?',
      type: 'accounting',
      urgency: 'normal',
      status: 'pending',
      desiredResponseDate: '2026-04-10',
    },
    {
      subject: 'Clôture comptable exercice 2025',
      topic: 'Bilan',
      description:
        'Nous souhaitons lancer la clôture des comptes annuels. Merci de nous indiquer les pièces manquantes.',
      type: 'accounting',
      urgency: 'urgent',
      status: 'in_progress',
      assignedToId: accountant.id,
      desiredResponseDate: '2026-05-01',
    },
    {
      subject: 'Attestation de régularité fiscale',
      topic: 'Documents',
      description: "Besoin d'une attestation de régularité fiscale pour un appel d'offres.",
      type: 'document',
      urgency: 'high',
      status: 'in_progress',
      assignedToId: accountant.id,
      response:
        "Nous avons commencé la vérification de vos déclarations. L'attestation sera disponible sous 48h.",
      respondedAt: new Date('2026-03-10T14:00:00Z'),
    },
    {
      subject: 'Consultation optimisation charges sociales',
      topic: 'Conseil',
      description:
        "Nous souhaitons un rendez-vous pour étudier les options d'optimisation de nos charges sociales.",
      type: 'consultation',
      urgency: 'normal',
      status: 'pending',
    },
    {
      subject: 'Transmission factures fournisseurs Q4',
      topic: 'Documents',
      description: 'Ci-joint les factures fournisseurs du quatrième trimestre pour enregistrement.',
      type: 'document',
      urgency: 'low',
      status: 'resolved',
      assignedToId: accountant.id,
      resolvedAt: new Date('2026-03-05T16:30:00Z'),
    },
    {
      subject: 'Rectification déclaration IRPP 2024',
      topic: 'Fiscalité',
      description:
        'Suite au contrôle, nous devons rectifier notre déclaration IRPP 2024. Merci de votre accompagnement.',
      type: 'tax',
      urgency: 'urgent',
      status: 'in_progress',
      assignedToId: accountant.id,
    },
    {
      subject: 'États financiers prévisionnels 2026',
      topic: 'Reporting',
      description:
        'Préparation des états financiers prévisionnels pour notre dossier de financement bancaire.',
      type: 'accounting',
      urgency: 'high',
      status: 'pending',
      desiredResponseDate: '2026-04-25',
    },
    {
      subject: 'Lettre de mission audit interne',
      topic: 'Audit',
      description: "Validation de la lettre de mission pour l'audit des comptes de gestion.",
      type: 'consultation',
      urgency: 'normal',
      status: 'resolved',
      assignedToId: accountant.id,
      resolvedAt: new Date('2026-02-28T11:00:00Z'),
    },
    {
      subject: 'Dépôt liasse fiscale annuelle',
      topic: 'Fiscalité',
      description:
        "Confirmation du dépôt de la liasse fiscale et réception de l'accusé de réception.",
      type: 'tax',
      urgency: 'normal',
      status: 'pending',
    },
  ];

  for (const req of requests) {
    await prisma.request.create({
      data: {
        subject: req.subject,
        topic: req.topic,
        description: req.description,
        type: req.type,
        urgency: req.urgency,
        status: req.status,
        clientId: client.id,
        companyId: client.companyId,
        accountingFirmId,
        assignedToId: req.assignedToId ?? null,
        desiredResponseDate: req.desiredResponseDate ?? null,
        response: req.response ?? null,
        respondedAt: req.respondedAt ?? null,
        resolvedAt: req.resolvedAt ?? null,
        attachments: [],
      },
    });
  }

  console.log(`✅ ${requests.length} requests (demandes) seeded successfully`);
}
