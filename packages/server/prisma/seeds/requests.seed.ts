import { PrismaClient } from '@prisma/client';

export async function seedRequests(prisma: PrismaClient) {
  console.log('🌱 Seeding requests...');

  // Get users
  const accountant = await prisma.user.findUnique({
    where: { email: 'comptable@finora.com' },
    include: { company: true },
  });
  const client = await prisma.user.findUnique({ where: { email: 'client@finora.com' } });

  if (!accountant || !client) {
    console.log('⚠️  Users not found, skipping request seeding');
    return;
  }

  if (!accountant.company) {
    console.log('⚠️  Accountant has no company, skipping request seeding');
    return;
  }

  // Use the accountant's company (accounting firm) for requests
  const accountingFirmCompany = accountant.company;

  // Delete existing requests to reseed
  const existingCount = await prisma.request.count();
  if (existingCount > 0) {
    console.log(`  - Deleting ${existingCount} existing requests...`);
    await prisma.request.deleteMany({});
  }

  // Create test requests
  const requests = [
    // Unassigned requests
    {
      subject: 'Déclaration TVA Q1 2026',
      topic: 'Taxe sur la valeur ajoutée',
      description:
        "Besoin d'aide pour préparer et soumettre la déclaration de TVA pour le premier trimestre 2026. Tous les documents sont prêts.",
      type: 'tax',
      urgency: 'high',
      status: 'pending',
      clientId: client.id,
      companyId: accountingFirmCompany.id,
      desiredResponseDate: new Date('2026-04-15').toISOString(),
      desiredResponseTime: '14:00',
      assignedToId: null,
    },
    {
      subject: 'Vérification des comptes annuels',
      topic: 'Bilan comptable',
      description:
        'Je souhaiterais une révision complète de mes comptes annuels 2025 avant de les soumettre aux autorités fiscales.',
      type: 'accounting',
      urgency: 'normal',
      status: 'pending',
      clientId: client.id,
      companyId: accountingFirmCompany.id,
      desiredResponseDate: new Date('2026-05-01').toISOString(),
      desiredResponseTime: '10:00',
      assignedToId: null,
    },
    {
      subject: 'Question sur les notes de frais',
      topic: 'Frais professionnels',
      description:
        "J'ai des questions concernant la déductibilité de certains frais professionnels. Pouvez-vous m'aider à clarifier ce qui est déductible?",
      type: 'consultation',
      urgency: 'low',
      status: 'pending',
      clientId: client.id,
      companyId: accountingFirmCompany.id,
      desiredResponseDate: new Date('2026-04-20').toISOString(),
      assignedToId: null,
    },
    {
      subject: "Besoin d'un certificat fiscal",
      topic: 'Documents administratifs',
      description:
        'Je dois obtenir un certificat fiscal pour une demande de crédit bancaire. Urgent.',
      type: 'document',
      urgency: 'urgent',
      status: 'pending',
      clientId: client.id,
      companyId: accountingFirmCompany.id,
      desiredResponseDate: new Date('2026-03-25').toISOString(),
      desiredResponseTime: '09:00',
      assignedToId: null,
    },

    // Assigned requests (to the accountant)
    {
      subject: 'Analyse de rentabilité',
      topic: 'Analyse financière',
      description:
        'Nous souhaitons une analyse approfondie de la rentabilité de nos différents services pour mieux orienter notre stratégie.',
      type: 'accounting',
      urgency: 'normal',
      status: 'in_progress',
      clientId: client.id,
      companyId: accountingFirmCompany.id,
      assignedToId: accountant.id,
      desiredResponseDate: new Date('2026-04-30').toISOString(),
      desiredResponseTime: '16:00',
    },
    {
      subject: 'Établissement des fiches de paie',
      topic: 'Paie et social',
      description:
        "Besoin d'aide pour établir les fiches de paie du mois de mars 2026 pour nos 5 employés.",
      type: 'accounting',
      urgency: 'high',
      status: 'in_progress',
      clientId: client.id,
      companyId: accountingFirmCompany.id,
      assignedToId: accountant.id,
      desiredResponseDate: new Date('2026-03-28').toISOString(),
      desiredResponseTime: '12:00',
    },
    {
      subject: 'Conseil pour optimisation fiscale',
      topic: 'Stratégie fiscale',
      description:
        "Je cherche des conseils pour optimiser ma situation fiscale en tant qu'entreprise. Quelles sont les options disponibles?",
      type: 'consultation',
      urgency: 'normal',
      status: 'pending',
      clientId: client.id,
      companyId: accountingFirmCompany.id,
      assignedToId: accountant.id,
      desiredResponseDate: new Date('2026-05-10').toISOString(),
      desiredResponseTime: '15:00',
    },
    {
      subject: 'Révision comptable mensuelle',
      topic: 'Suivi mensuel',
      description: 'Révision comptable habituelle pour le mois de février 2026.',
      type: 'accounting',
      urgency: 'normal',
      status: 'resolved',
      response:
        'Révision effectuée. Tous les comptes sont en ordre. Quelques ajustements mineurs ont été apportés.',
      clientId: client.id,
      companyId: accountingFirmCompany.id,
      assignedToId: accountant.id,
      respondedAt: new Date('2026-03-10'),
      resolvedAt: new Date('2026-03-10'),
      desiredResponseDate: new Date('2026-03-05').toISOString(),
    },
  ];

  for (const request of requests) {
    await prisma.request.create({
      data: request,
    });
  }

  console.log('✓ Requests seeded successfully');
  console.log(`  - Created ${requests.length} test requests`);
  console.log(`  - ${requests.filter((r) => r.assignedToId === null).length} unassigned requests`);
  console.log(
    `  - ${requests.filter((r) => r.assignedToId === accountant.id).length} assigned to accountant`
  );
}
