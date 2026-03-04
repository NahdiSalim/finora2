import { PrismaClient } from '@prisma/client';

export async function seedActions(prisma: PrismaClient) {
  // Get all pages
  const pages = await prisma.pages.findMany();

  const actions = [
    // Dashboard
    {
      name: 'Voir le dashboard',
      code: 'VIEW_DASHBOARD',
      category: 'read',
      pageSlug: 'dashboard-view',
    },

    // Gestion des comptes comptables
    {
      name: 'Voir la liste des comptables',
      code: 'VIEW_ACCOUNTANTS',
      category: 'read',
      pageSlug: 'accountants-list',
    },
    {
      name: 'Créer un comptable',
      code: 'CREATE_ACCOUNTANT',
      category: 'write',
      pageSlug: 'accountants-list',
    },
    {
      name: 'Voir les comptables en attente',
      code: 'VIEW_PENDING_ACCOUNTANTS',
      category: 'read',
      pageSlug: 'accountants-pending',
    },
    {
      name: "Voir le détail d'un comptable",
      code: 'VIEW_ACCOUNTANT_DETAIL',
      category: 'read',
      pageSlug: 'accountant-detail',
    },
    {
      name: 'Modifier un comptable',
      code: 'UPDATE_ACCOUNTANT',
      category: 'write',
      pageSlug: 'accountant-detail',
    },
    {
      name: 'Activer un comptable',
      code: 'ACTIVATE_ACCOUNTANT',
      category: 'write',
      pageSlug: 'accountant-detail',
    },
    {
      name: 'Suspendre un comptable',
      code: 'SUSPEND_ACCOUNTANT',
      category: 'write',
      pageSlug: 'accountant-detail',
    },
    {
      name: 'Supprimer un comptable',
      code: 'DELETE_ACCOUNTANT',
      category: 'write',
      pageSlug: 'accountant-detail',
    },

    // Archive
    { name: 'Voir les archives', code: 'VIEW_ARCHIVE', category: 'read', pageSlug: 'archive-view' },

    // Gestion des documents
    {
      name: 'Voir la liste des documents',
      code: 'VIEW_DOCUMENTS',
      category: 'read',
      pageSlug: 'documents-list',
    },
    {
      name: 'Créer un document',
      code: 'CREATE_DOCUMENT',
      category: 'write',
      pageSlug: 'documents-list',
    },
    {
      name: "Voir le détail d'un document",
      code: 'VIEW_DOCUMENT_DETAIL',
      category: 'read',
      pageSlug: 'document-detail',
    },
    {
      name: 'Modifier un document',
      code: 'UPDATE_DOCUMENT',
      category: 'write',
      pageSlug: 'document-detail',
    },
    {
      name: 'Supprimer un document',
      code: 'DELETE_DOCUMENT',
      category: 'write',
      pageSlug: 'document-detail',
    },

    // Gestion des rendez-vous
    {
      name: 'Voir la liste des rendez-vous',
      code: 'VIEW_MEETINGS',
      category: 'read',
      pageSlug: 'meetings-list',
    },
    {
      name: 'Créer un rendez-vous',
      code: 'CREATE_MEETING',
      category: 'write',
      pageSlug: 'meetings-list',
    },
    {
      name: "Voir le détail d'un rendez-vous",
      code: 'VIEW_MEETING_DETAIL',
      category: 'read',
      pageSlug: 'meeting-detail',
    },
    {
      name: 'Modifier un rendez-vous',
      code: 'UPDATE_MEETING',
      category: 'write',
      pageSlug: 'meeting-detail',
    },
    {
      name: 'Supprimer un rendez-vous',
      code: 'DELETE_MEETING',
      category: 'write',
      pageSlug: 'meeting-detail',
    },

    // Gestion des demandes
    {
      name: 'Voir la liste des demandes',
      code: 'VIEW_REQUESTS',
      category: 'read',
      pageSlug: 'requests-list',
    },
    {
      name: 'Créer une demande',
      code: 'CREATE_REQUEST',
      category: 'write',
      pageSlug: 'requests-list',
    },
    {
      name: "Voir le détail d'une demande",
      code: 'VIEW_REQUEST_DETAIL',
      category: 'read',
      pageSlug: 'request-detail',
    },
    {
      name: 'Modifier une demande',
      code: 'UPDATE_REQUEST',
      category: 'write',
      pageSlug: 'request-detail',
    },
    {
      name: 'Supprimer une demande',
      code: 'DELETE_REQUEST',
      category: 'write',
      pageSlug: 'request-detail',
    },

    // Messagerie
    {
      name: 'Voir les messages',
      code: 'VIEW_MESSAGES',
      category: 'read',
      pageSlug: 'messages-list',
    },
    {
      name: 'Envoyer un message',
      code: 'SEND_MESSAGE',
      category: 'write',
      pageSlug: 'messages-list',
    },
    {
      name: "Voir le détail d'un message",
      code: 'VIEW_MESSAGE_DETAIL',
      category: 'read',
      pageSlug: 'message-detail',
    },

    // Mes banques
    { name: 'Voir mes banques', code: 'VIEW_BANKS', category: 'read', pageSlug: 'banks-list' },
    { name: 'Ajouter une banque', code: 'ADD_BANK', category: 'write', pageSlug: 'banks-list' },

    // Réseautage
    {
      name: 'Voir le réseautage',
      code: 'VIEW_NETWORK',
      category: 'read',
      pageSlug: 'network-view',
    },

    // Profil
    { name: 'Voir mon profil', code: 'VIEW_PROFILE', category: 'read', pageSlug: 'profile-view' },
    {
      name: 'Modifier mon profil',
      code: 'UPDATE_PROFILE',
      category: 'write',
      pageSlug: 'profile-edit',
    },

    // Gestion des collaborateurs
    {
      name: 'Voir la liste des collaborateurs',
      code: 'VIEW_COLLABORATORS',
      category: 'read',
      pageSlug: 'collaborators-list',
    },
    {
      name: 'Créer un collaborateur',
      code: 'CREATE_COLLABORATOR',
      category: 'write',
      pageSlug: 'collaborators-list',
    },
    {
      name: "Voir le détail d'un collaborateur",
      code: 'VIEW_COLLABORATOR_DETAIL',
      category: 'read',
      pageSlug: 'collaborator-detail',
    },
    {
      name: 'Modifier un collaborateur',
      code: 'UPDATE_COLLABORATOR',
      category: 'write',
      pageSlug: 'collaborator-detail',
    },
    {
      name: 'Supprimer un collaborateur',
      code: 'DELETE_COLLABORATOR',
      category: 'write',
      pageSlug: 'collaborator-detail',
    },

    // Gestion des tâches
    {
      name: 'Voir la liste des tâches',
      code: 'VIEW_TASKS',
      category: 'read',
      pageSlug: 'tasks-list',
    },
    { name: 'Créer une tâche', code: 'CREATE_TASK', category: 'write', pageSlug: 'tasks-list' },
    {
      name: "Voir le détail d'une tâche",
      code: 'VIEW_TASK_DETAIL',
      category: 'read',
      pageSlug: 'task-detail',
    },
    { name: 'Modifier une tâche', code: 'UPDATE_TASK', category: 'write', pageSlug: 'task-detail' },
    {
      name: 'Supprimer une tâche',
      code: 'DELETE_TASK',
      category: 'write',
      pageSlug: 'task-detail',
    },

    // Gestion des clients
    {
      name: 'Voir la liste des clients',
      code: 'VIEW_CLIENTS',
      category: 'read',
      pageSlug: 'clients-list',
    },
    {
      name: 'Créer un client',
      code: 'CREATE_CLIENT',
      category: 'write',
      pageSlug: 'clients-list',
    },
    {
      name: "Voir le détail d'un client",
      code: 'VIEW_CLIENT_DETAIL',
      category: 'read',
      pageSlug: 'client-detail',
    },
    {
      name: 'Modifier un client',
      code: 'UPDATE_CLIENT',
      category: 'write',
      pageSlug: 'client-detail',
    },
    {
      name: 'Supprimer un client',
      code: 'DELETE_CLIENT',
      category: 'write',
      pageSlug: 'client-detail',
    },
  ];

  for (const action of actions) {
    const page = pages.find((p) => p.slug === action.pageSlug);
    if (page) {
      await prisma.action.upsert({
        where: { code: action.code },
        update: {
          name: action.name,
          category: action.category,
          pageId: page.id,
        },
        create: {
          name: action.name,
          code: action.code,
          category: action.category,
          pageId: page.id,
        },
      });
    }
  }

  console.log(' Actions seeded successfully');
}
