import { PrismaClient } from '@prisma/client';

export async function seedTasks(prisma: PrismaClient) {
  console.log('🔄 Seeding tasks...');

  // Get users
  const accountant = await prisma.user.findUnique({
    where: { email: 'comptable@finora.com' },
    include: { company: true },
  });

  const collaborator = await prisma.user.findUnique({
    where: { email: 'collaborateur@finora.com' },
  });

  const client = await prisma.user.findUnique({
    where: { email: 'client@finora.com' },
  });

  if (!accountant || !collaborator || !client) {
    console.log('⚠️  Required users not found, skipping tasks seed');
    return;
  }

  // Delete existing tasks
  await prisma.task.deleteMany({});

  // Create sample tasks
  const tasks = [
    {
      title: 'Préparation du bilan annuel 2025',
      description:
        "Préparer et vérifier tous les documents nécessaires pour le bilan annuel de l'exercice 2025. Inclure les états financiers, les annexes et les justificatifs.",
      type: 'accounting',
      priority: 'high',
      status: 'todo',
      dueDate: new Date('2026-04-15'),
      assigneeId: collaborator.id,
      createdById: accountant.id,
      clientId: client.id,
      companyId: accountant.companyId,
      progress: 0,
      attachments: [],
      subtasks: [],
    },
    {
      title: 'Révision des comptes de janvier',
      description:
        "Vérifier et valider toutes les écritures comptables du mois de janvier. S'assurer de la conformité avec les normes en vigueur.",
      type: 'review',
      priority: 'medium',
      status: 'in_progress',
      dueDate: new Date('2026-03-25'),
      assigneeId: collaborator.id,
      createdById: accountant.id,
      clientId: client.id,
      companyId: accountant.companyId,
      progress: 45,
      attachments: [],
      subtasks: [
        JSON.stringify([
          {
            id: '1',
            userId: collaborator.id,
            username: 'Fatma Trabelsi',
            comment:
              "J'ai commencé la révision des comptes. Les factures du mois sont en cours de vérification.",
            attachments: [],
            createdAt: new Date('2026-03-15T10:30:00Z').toISOString(),
          },
        ]),
      ],
    },
    {
      title: 'Réunion avec le client - Planification fiscale',
      description:
        'Organiser une réunion pour discuter de la planification fiscale et des optimisations possibles pour le prochain exercice.',
      type: 'meeting',
      priority: 'urgent',
      status: 'todo',
      dueDate: new Date('2026-03-20'),
      assigneeId: collaborator.id,
      createdById: accountant.id,
      clientId: client.id,
      companyId: accountant.companyId,
      progress: 0,
      attachments: [],
      subtasks: [],
    },
    {
      title: 'Traitement des déclarations TVA',
      description:
        'Préparer et soumettre les déclarations de TVA pour le trimestre. Vérifier tous les montants et justificatifs.',
      type: 'accounting',
      priority: 'high',
      status: 'in_progress',
      dueDate: new Date('2026-03-30'),
      assigneeId: collaborator.id,
      createdById: accountant.id,
      clientId: client.id,
      companyId: accountant.companyId,
      progress: 60,
      attachments: [],
      subtasks: [],
    },
    {
      title: 'Vérification des factures fournisseurs',
      description:
        'Contrôler et enregistrer toutes les factures fournisseurs reçues ce mois. Vérifier la conformité et les montants.',
      type: 'document',
      priority: 'medium',
      status: 'completed',
      dueDate: new Date('2026-03-18'),
      assigneeId: collaborator.id,
      createdById: accountant.id,
      clientId: client.id,
      companyId: accountant.companyId,
      progress: 100,
      completedAt: new Date('2026-03-17'),
      attachments: [],
      subtasks: [
        JSON.stringify([
          {
            id: '2',
            userId: collaborator.id,
            username: 'Fatma Trabelsi',
            comment:
              'Toutes les factures ont été vérifiées et enregistrées. Aucune anomalie détectée.',
            attachments: [],
            createdAt: new Date('2026-03-17T14:20:00Z').toISOString(),
          },
          {
            id: '3',
            userId: accountant.id,
            username: 'Ahmed Ben Ali',
            comment: 'Parfait, merci pour le travail rapide et précis.',
            attachments: [],
            createdAt: new Date('2026-03-17T15:00:00Z').toISOString(),
          },
        ]),
      ],
    },
    {
      title: 'Rapprochement bancaire février',
      description:
        'Effectuer le rapprochement bancaire pour le mois de février. Identifier et justifier tous les écarts.',
      type: 'accounting',
      priority: 'low',
      status: 'todo',
      dueDate: new Date('2026-03-28'),
      assigneeId: collaborator.id,
      createdById: accountant.id,
      companyId: accountant.companyId,
      progress: 0,
      attachments: [],
      subtasks: [],
    },
  ];

  for (const taskData of tasks) {
    await prisma.task.create({
      data: taskData as any,
    });
  }

  console.log(`✅ ${tasks.length} tasks seeded successfully`);
}
