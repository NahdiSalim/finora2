import { PrismaClient } from '@prisma/client';

export async function seedPages(prisma: PrismaClient) {
  // Get features
  const dashboard = await prisma.feature.findUnique({ where: { slug: 'dashboard' } });
  const gestionComptables = await prisma.feature.findUnique({
    where: { slug: 'gestion-comptes-comptables' },
  });
  const archive = await prisma.feature.findUnique({ where: { slug: 'archive' } });
  const gestionDocuments = await prisma.feature.findUnique({
    where: { slug: 'gestion-documents' },
  });
  const gestionRendezVous = await prisma.feature.findUnique({
    where: { slug: 'gestion-rendez-vous' },
  });
  const gestionDemandes = await prisma.feature.findUnique({ where: { slug: 'gestion-demandes' } });
  const messagerie = await prisma.feature.findUnique({ where: { slug: 'messagerie' } });
  const mesBanques = await prisma.feature.findUnique({ where: { slug: 'mes-banques' } });
  const reseautage = await prisma.feature.findUnique({ where: { slug: 'reseautage' } });
  const profil = await prisma.feature.findUnique({ where: { slug: 'profil' } });
  const gestionCollaborateurs = await prisma.feature.findUnique({
    where: { slug: 'gestion-collaborateurs' },
  });
  const gestionTaches = await prisma.feature.findUnique({ where: { slug: 'gestion-taches' } });
  const gestionClients = await prisma.feature.findUnique({ where: { slug: 'gestion-clients' } });
  const gestionUtilisateurs = await prisma.feature.findUnique({
    where: { slug: 'gestion-utilisateurs' },
  });

  const pages = [
    // Dashboard
    { PageUrl: '/dashboard', slug: 'dashboard-view', featureId: dashboard!.id },

    // Gestion des utilisateurs (super admin)
    { PageUrl: '/users', slug: 'users-list', featureId: gestionUtilisateurs!.id },
    { PageUrl: '/users/:id', slug: 'user-detail', featureId: gestionUtilisateurs!.id },

    // Gestion des comptes comptables (Admin)
    { PageUrl: '/admin/accountants', slug: 'accountants-list', featureId: gestionComptables!.id },
    {
      PageUrl: '/admin/accountants/pending',
      slug: 'accountants-pending',
      featureId: gestionComptables!.id,
    },
    {
      PageUrl: '/admin/accountants/:id',
      slug: 'accountant-detail',
      featureId: gestionComptables!.id,
    },

    // Archive
    { PageUrl: '/archive', slug: 'archive-view', featureId: archive!.id },

    // Gestion des documents
    { PageUrl: '/documents', slug: 'documents-list', featureId: gestionDocuments!.id },
    { PageUrl: '/documents/:id', slug: 'document-detail', featureId: gestionDocuments!.id },

    // Gestion des rendez-vous
    { PageUrl: '/meetings', slug: 'meetings-list', featureId: gestionRendezVous!.id },
    { PageUrl: '/meetings/:id', slug: 'meeting-detail', featureId: gestionRendezVous!.id },
    { PageUrl: '/appointments', slug: 'appointments-list', featureId: gestionRendezVous!.id },
    { PageUrl: '/appointments/:id', slug: 'appointment-detail', featureId: gestionRendezVous!.id },
    {
      PageUrl: '/appointments/calendar',
      slug: 'appointments-calendar',
      featureId: gestionRendezVous!.id,
    },
    {
      PageUrl: '/appointments/history',
      slug: 'appointments-history',
      featureId: gestionRendezVous!.id,
    },

    // Gestion des demandes
    { PageUrl: '/requests', slug: 'requests-list', featureId: gestionDemandes!.id },
    { PageUrl: '/requests/:id', slug: 'request-detail', featureId: gestionDemandes!.id },

    // Messagerie
    { PageUrl: '/messages', slug: 'messages-list', featureId: messagerie!.id },
    { PageUrl: '/messages/:id', slug: 'message-detail', featureId: messagerie!.id },

    // Mes banques
    { PageUrl: '/banks', slug: 'banks-list', featureId: mesBanques!.id },

    // Réseautage
    { PageUrl: '/network', slug: 'network-view', featureId: reseautage!.id },

    // Profil
    { PageUrl: '/profile', slug: 'profile-view', featureId: profil!.id },
    { PageUrl: '/profile/edit', slug: 'profile-edit', featureId: profil!.id },

    // Gestion des collaborateurs
    { PageUrl: '/collaborators', slug: 'collaborators-list', featureId: gestionCollaborateurs!.id },
    {
      PageUrl: '/collaborators/:id',
      slug: 'collaborator-detail',
      featureId: gestionCollaborateurs!.id,
    },

    // Gestion des tâches
    { PageUrl: '/tasks', slug: 'tasks-list', featureId: gestionTaches!.id },
    { PageUrl: '/tasks/:id', slug: 'task-detail', featureId: gestionTaches!.id },

    // Gestion des clients
    { PageUrl: '/clients', slug: 'clients-list', featureId: gestionClients!.id },
    { PageUrl: '/clients/:id', slug: 'client-detail', featureId: gestionClients!.id },
  ];

  for (const page of pages) {
    await prisma.pages.upsert({
      where: { slug: page.slug },
      update: {
        PageUrl: page.PageUrl,
        featureId: page.featureId,
      },
      create: {
        PageUrl: page.PageUrl,
        slug: page.slug,
        featureId: page.featureId,
      },
    });
  }

  console.log(' Pages seeded successfully');
}
