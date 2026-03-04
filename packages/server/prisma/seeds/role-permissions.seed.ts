import { PrismaClient } from '@prisma/client';

export async function seedRolePermissions(prisma: PrismaClient) {
  // Get roles
  const adminRole = await prisma.role.findUnique({ where: { code: 'ADMINISTRATOR' } });
  const accountantRole = await prisma.role.findUnique({ where: { code: 'ACCOUNTANT' } });
  const collaboratorRole = await prisma.role.findUnique({ where: { code: 'COLLABORATOR' } });
  const clientRole = await prisma.role.findUnique({ where: { code: 'CLIENT' } });

  // Get all actions with their page and feature relations
  const allActions = await prisma.action.findMany({
    include: {
      page: {
        include: {
          feature: true,
        },
      },
    },
  });

  // Admin permissions: Dashboard + Gestion des comptes comptables + Profil
  const adminActionCodes = [
    'VIEW_DASHBOARD',
    'VIEW_ACCOUNTANTS',
    'CREATE_ACCOUNTANT',
    'VIEW_PENDING_ACCOUNTANTS',
    'VIEW_ACCOUNTANT_DETAIL',
    'UPDATE_ACCOUNTANT',
    'ACTIVATE_ACCOUNTANT',
    'SUSPEND_ACCOUNTANT',
    'DELETE_ACCOUNTANT',
    'VIEW_PROFILE',
    'UPDATE_PROFILE',
  ];

  // Client permissions: Archive + Documents + Rendez-vous + Demandes + Messagerie + Banques + Réseautage + Profil
  const clientActionCodes = [
    'VIEW_ARCHIVE',
    'VIEW_DOCUMENTS',
    'CREATE_DOCUMENT',
    'VIEW_DOCUMENT_DETAIL',
    'UPDATE_DOCUMENT',
    'DELETE_DOCUMENT',
    'VIEW_MEETINGS',
    'CREATE_MEETING',
    'VIEW_MEETING_DETAIL',
    'UPDATE_MEETING',
    'DELETE_MEETING',
    'VIEW_REQUESTS',
    'CREATE_REQUEST',
    'VIEW_REQUEST_DETAIL',
    'UPDATE_REQUEST',
    'DELETE_REQUEST',
    'VIEW_MESSAGES',
    'SEND_MESSAGE',
    'VIEW_MESSAGE_DETAIL',
    'VIEW_BANKS',
    'ADD_BANK',
    'VIEW_NETWORK',
    'VIEW_PROFILE',
    'UPDATE_PROFILE',
  ];

  // Accountant permissions: Collaborateurs + Demandes + Rendez-vous + Dashboard + Réseautage + Messagerie + Documents + Archive + Tâches + Clients + Profil
  const accountantActionCodes = [
    'VIEW_COLLABORATORS',
    'CREATE_COLLABORATOR',
    'VIEW_COLLABORATOR_DETAIL',
    'UPDATE_COLLABORATOR',
    'DELETE_COLLABORATOR',
    'VIEW_REQUESTS',
    'CREATE_REQUEST',
    'VIEW_REQUEST_DETAIL',
    'UPDATE_REQUEST',
    'DELETE_REQUEST',
    'VIEW_MEETINGS',
    'CREATE_MEETING',
    'VIEW_MEETING_DETAIL',
    'UPDATE_MEETING',
    'DELETE_MEETING',
    'VIEW_DASHBOARD',
    'VIEW_NETWORK',
    'VIEW_MESSAGES',
    'SEND_MESSAGE',
    'VIEW_MESSAGE_DETAIL',
    'VIEW_DOCUMENTS',
    'CREATE_DOCUMENT',
    'VIEW_DOCUMENT_DETAIL',
    'UPDATE_DOCUMENT',
    'DELETE_DOCUMENT',
    'VIEW_ARCHIVE',
    'VIEW_TASKS',
    'CREATE_TASK',
    'VIEW_TASK_DETAIL',
    'UPDATE_TASK',
    'DELETE_TASK',
    'VIEW_CLIENTS',
    'CREATE_CLIENT',
    'VIEW_CLIENT_DETAIL',
    'UPDATE_CLIENT',
    'DELETE_CLIENT',
    'VIEW_PROFILE',
    'UPDATE_PROFILE',
  ];

  // Collaborator permissions: Tâches + Profil
  const collaboratorActionCodes = [
    'VIEW_TASKS',
    'CREATE_TASK',
    'VIEW_TASK_DETAIL',
    'UPDATE_TASK',
    'DELETE_TASK',
    'VIEW_PROFILE',
    'UPDATE_PROFILE',
  ];

  // Helper function to assign permissions with automatic page and feature creation
  async function assignPermissions(roleId: number, actionCodes: string[]) {
    const pageIds = new Set<number>();
    const featureIds = new Set<number>();

    for (const code of actionCodes) {
      const action = allActions.find((a) => a.code === code);
      if (action) {
        // Create roleAction
        await prisma.roleAction.upsert({
          where: {
            roleId_actionId: {
              roleId,
              actionId: action.id,
            },
          },
          update: {},
          create: {
            roleId,
            actionId: action.id,
          },
        });

        // Collect page and feature IDs
        pageIds.add(action.page.id);
        featureIds.add(action.page.feature.id);
      }
    }

    // Create p_pages relationships
    for (const pageId of pageIds) {
      await prisma.p_pages.upsert({
        where: {
          role_id_page_id: {
            role_id: roleId,
            page_id: pageId,
          },
        },
        update: {},
        create: {
          role_id: roleId,
          page_id: pageId,
        },
      });
    }

    // Create p_features relationships
    for (const featureId of featureIds) {
      await prisma.p_features.upsert({
        where: {
          role_id_feature_id: {
            role_id: roleId,
            feature_id: featureId,
          },
        },
        update: {},
        create: {
          role_id: roleId,
          feature_id: featureId,
        },
      });
    }
  }

  // Assign permissions to all roles
  await assignPermissions(adminRole!.id, adminActionCodes);
  await assignPermissions(clientRole!.id, clientActionCodes);
  await assignPermissions(accountantRole!.id, accountantActionCodes);
  await assignPermissions(collaboratorRole!.id, collaboratorActionCodes);

  console.log(' Role permissions (actions, pages, features) seeded successfully');
}
