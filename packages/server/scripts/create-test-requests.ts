import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  }),
});

async function createTestRequests() {
  try {
    console.log('🚀 Creating test requests...\n');

    // Get test users
    const client = await prisma.user.findUnique({ where: { email: 'client@finora.com' } });
    const accountant = await prisma.user.findUnique({ where: { email: 'comptable@finora.com' } });

    if (!client || !accountant) {
      console.log('❌ Error: Required users not found. Please run seed first.');
      return;
    }

    // Clear existing requests from this client
    await prisma.request.deleteMany({
      where: { clientId: client.id },
    });

    const requestsData = [
      {
        subject: 'Déclaration TVA Q1 2026',
        topic: 'TVA trimestrielle',
        description:
          "Je dois soumettre ma déclaration de TVA pour le premier trimestre 2026. Pourriez-vous m'aider avec les calculs et la soumission?",
        type: 'tax',
        urgency: 'urgent',
        status: 'pending',
        clientId: client.id,
        companyId: client.companyId,
        desiredResponseDate: '2026-03-15',
        desiredResponseTime: '14:00',
      },
      {
        subject: 'Révision comptable annuelle',
        topic: 'Bilan annuel',
        description:
          "Nous avons besoin d'une révision complète de nos comptes pour l'année fiscale 2025.",
        type: 'accounting',
        urgency: 'high',
        status: 'in_progress',
        clientId: client.id,
        companyId: client.companyId,
        assignedToId: accountant.id,
        respondedAt: new Date('2026-03-05'),
        response:
          'Nous avons commencé la révision. Les premiers résultats seront disponibles cette semaine.',
        desiredResponseDate: '2026-03-20',
        desiredResponseTime: '10:00',
      },
      {
        subject: 'Consultation fiscale entreprise',
        topic: 'Optimisation fiscale',
        description:
          "Je souhaite obtenir des conseils sur l'optimisation fiscale pour mon entreprise.",
        type: 'consultation',
        urgency: 'normal',
        status: 'resolved',
        clientId: client.id,
        companyId: client.companyId,
        assignedToId: accountant.id,
        respondedAt: new Date('2026-02-15'),
        resolvedAt: new Date('2026-02-28'),
        response:
          'Consultation complétée. Veuillez trouver le rapport détaillé dans vos documents.',
        desiredResponseDate: '2026-02-20',
        desiredResponseTime: '15:30',
      },
      {
        subject: 'Demande de bilan prévisionnel',
        topic: 'Prévisions 2026',
        description:
          "Besoin d'un bilan prévisionnel pour l'année 2026 afin de planifier nos investissements.",
        type: 'accounting',
        urgency: 'high',
        status: 'pending',
        clientId: client.id,
        companyId: client.companyId,
        desiredResponseDate: '2026-03-18',
        desiredResponseTime: '09:00',
      },
      {
        subject: 'Vérification documents comptables',
        topic: 'Audit interne',
        description: 'Pouvez-vous vérifier mes documents comptables du mois de février?',
        type: 'document',
        urgency: 'normal',
        status: 'in_progress',
        clientId: client.id,
        companyId: client.companyId,
        assignedToId: accountant.id,
        respondedAt: new Date('2026-03-08'),
        response: 'Documents reçus. Vérification en cours.',
        desiredResponseDate: '2026-03-12',
        desiredResponseTime: '11:00',
      },
      {
        subject: 'Question sur déduction fiscale',
        topic: 'Déductions',
        description:
          "J'ai une question concernant les déductions fiscales pour les frais de déplacement professionnel.",
        type: 'tax',
        urgency: 'low',
        status: 'resolved',
        clientId: client.id,
        companyId: client.companyId,
        assignedToId: accountant.id,
        respondedAt: new Date('2026-02-20'),
        resolvedAt: new Date('2026-02-22'),
        response:
          'Les frais de déplacement professionnel sont déductibles à 100% sous certaines conditions.',
        desiredResponseDate: '2026-02-25',
        desiredResponseTime: '16:00',
      },
      {
        subject: 'Aide pour déclaration IS',
        topic: 'Impôt sur les sociétés',
        description: "Assistance nécessaire pour remplir la déclaration d'impôt sur les sociétés.",
        type: 'tax',
        urgency: 'urgent',
        status: 'in_progress',
        clientId: client.id,
        companyId: client.companyId,
        assignedToId: accountant.id,
        respondedAt: new Date('2026-03-10'),
        response: 'Nous préparons votre déclaration IS. Elle sera prête demain.',
        desiredResponseDate: '2026-03-14',
        desiredResponseTime: '13:00',
      },
      {
        subject: "Demande d'attestation fiscale",
        topic: 'Attestations',
        description: "J'ai besoin d'une attestation fiscale pour mon dossier bancaire.",
        type: 'document',
        urgency: 'normal',
        status: 'rejected',
        clientId: client.id,
        companyId: client.companyId,
        assignedToId: accountant.id,
        respondedAt: new Date('2026-03-01'),
        response:
          'Nous ne pouvons pas émettre cette attestation sans documents justificatifs complets.',
        desiredResponseDate: '2026-03-05',
        desiredResponseTime: '14:30',
      },
      {
        subject: 'Conseil restructuration comptable',
        topic: 'Restructuration',
        description:
          'Nous envisageons une restructuration de notre système comptable. Besoin de conseils.',
        type: 'consultation',
        urgency: 'low',
        status: 'pending',
        clientId: client.id,
        companyId: client.companyId,
        desiredResponseDate: '2026-03-25',
        desiredResponseTime: '10:30',
      },
      {
        subject: 'Rapport financier mensuel',
        topic: 'Rapports',
        description: 'Demande du rapport financier pour le mois de février 2026.',
        type: 'accounting',
        urgency: 'normal',
        status: 'resolved',
        clientId: client.id,
        companyId: client.companyId,
        assignedToId: accountant.id,
        respondedAt: new Date('2026-03-03'),
        resolvedAt: new Date('2026-03-05'),
        response: 'Rapport financier complété et envoyé par email.',
        desiredResponseDate: '2026-03-06',
        desiredResponseTime: '12:00',
      },
      {
        subject: 'Modification statuts société',
        topic: 'Documents légaux',
        description:
          "Besoin d'aide pour modifier les statuts de ma société suite à l'arrivée d'un nouvel associé.",
        type: 'other',
        urgency: 'high',
        status: 'cancelled',
        clientId: client.id,
        companyId: client.companyId,
        desiredResponseDate: '2026-03-10',
        desiredResponseTime: '09:30',
      },
      {
        subject: 'Clôture exercice comptable 2025',
        topic: 'Clôture annuelle',
        description:
          "Assistance pour la clôture de l'exercice comptable 2025 et préparation des documents fiscaux.",
        type: 'accounting',
        urgency: 'urgent',
        status: 'in_progress',
        clientId: client.id,
        companyId: client.companyId,
        assignedToId: accountant.id,
        respondedAt: new Date('2026-03-09'),
        response: 'Clôture en cours. Nous finalisons les écritures comptables.',
        desiredResponseDate: '2026-03-16',
        desiredResponseTime: '17:00',
      },
    ];

    let created = 0;
    for (const requestData of requestsData) {
      await prisma.request.create({
        data: requestData,
      });
      created++;
    }

    console.log(`✅ Successfully created ${created} test requests!\n`);
    console.log('📊 Status breakdown:');
    console.log('   - Pending: 3 requests');
    console.log('   - In Progress: 4 requests');
    console.log('   - Resolved: 3 requests');
    console.log('   - Rejected: 1 request');
    console.log('   - Cancelled: 1 request');
    console.log('\n🎯 Refresh your UI to see the requests!');
  } catch (error) {
    console.error('❌ Error creating test requests:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createTestRequests();
