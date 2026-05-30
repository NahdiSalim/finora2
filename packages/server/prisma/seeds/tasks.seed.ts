import { PrismaClient } from '@prisma/client';

export async function seedTasks(prisma: PrismaClient, force = false) {
  console.log('🔄 Seeding tasks (tâches)...');

  const taskCount = await prisma.task.count();
  if (taskCount > 0 && !force) {
    console.log(
      '⚠️  Tasks already exist, skipping tasks seed (use FORCE_DEMO_SEED=true to replace)'
    );
    return;
  }

  if (force && taskCount > 0) {
    await prisma.taskClient.deleteMany({});
    await prisma.task.deleteMany({});
    console.log('   Cleared existing tasks');
  }

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

  const tasks = [
    {
      title: 'Préparation du bilan annuel 2025',
      description:
        "Préparer et vérifier tous les documents nécessaires pour le bilan annuel de l'exercice 2025.",
      type: 'accounting',
      priority: 'high',
      status: 'todo',
      dueDate: new Date('2026-04-15'),
      progress: 0,
    },
    {
      title: 'Révision des comptes de janvier',
      description: 'Vérifier et valider toutes les écritures comptables du mois de janvier.',
      type: 'review',
      priority: 'medium',
      status: 'in_progress',
      dueDate: new Date('2026-03-25'),
      progress: 45,
    },
    {
      title: 'Réunion client — planification fiscale',
      description:
        'Organiser une réunion pour discuter de la planification fiscale du prochain exercice.',
      type: 'meeting',
      priority: 'urgent',
      status: 'todo',
      dueDate: new Date('2026-03-20'),
      progress: 0,
    },
    {
      title: 'Traitement des déclarations TVA',
      description: 'Préparer et soumettre les déclarations de TVA pour le trimestre en cours.',
      type: 'accounting',
      priority: 'high',
      status: 'in_progress',
      dueDate: new Date('2026-03-30'),
      progress: 60,
    },
    {
      title: 'Vérification des factures fournisseurs',
      description: 'Contrôler et enregistrer toutes les factures fournisseurs reçues ce mois.',
      type: 'document',
      priority: 'medium',
      status: 'in_review',
      dueDate: new Date('2026-03-18'),
      progress: 90,
    },
    {
      title: 'Rapprochement bancaire février',
      description:
        'Effectuer le rapprochement bancaire pour le mois de février et justifier les écarts.',
      type: 'accounting',
      priority: 'low',
      status: 'todo',
      dueDate: new Date('2026-03-28'),
      progress: 0,
    },
    {
      title: 'Établissement liasse fiscale 2025',
      description: 'Compiler les données et établir la liasse fiscale pour dépôt avant échéance.',
      type: 'accounting',
      priority: 'urgent',
      status: 'in_review',
      dueDate: new Date('2026-04-05'),
      progress: 85,
    },
    {
      title: 'Contrôle des immobilisations',
      description: "Vérifier le registre des immobilisations et les amortissements de l'exercice.",
      type: 'review',
      priority: 'medium',
      status: 'completed',
      dueDate: new Date('2026-03-15'),
      progress: 100,
      completedAt: new Date('2026-03-14'),
    },
    {
      title: 'Lettrage comptes clients et fournisseurs',
      description: 'Effectuer le lettrage des comptes clients et fournisseurs au 31/03.',
      type: 'accounting',
      priority: 'medium',
      status: 'completed',
      dueDate: new Date('2026-03-12'),
      progress: 100,
      completedAt: new Date('2026-03-11'),
    },
    {
      title: 'Analyse des charges sociales',
      description: "Analyser les charges sociales et proposer des recommandations d'optimisation.",
      type: 'other',
      priority: 'low',
      status: 'in_progress',
      dueDate: new Date('2026-04-20'),
      progress: 30,
    },
  ];

  for (const taskData of tasks) {
    const task = await prisma.task.create({
      data: {
        title: taskData.title,
        description: taskData.description,
        type: taskData.type,
        priority: taskData.priority,
        status: taskData.status,
        dueDate: taskData.dueDate,
        assigneeId: collaborator.id,
        createdById: accountant.id,
        companyId: accountant.companyId,
        progress: taskData.progress,
        completedAt: taskData.completedAt ?? null,
        attachments: [],
        subtasks: [],
      },
    });

    await prisma.taskClient.create({
      data: {
        taskId: task.id,
        clientId: client.id,
      },
    });
  }

  console.log(`✅ ${tasks.length} tasks (tâches) seeded successfully`);
}
