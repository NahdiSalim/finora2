import { PrismaClient } from '@prisma/client';

export async function seedRoles(prisma: PrismaClient) {
  const roles = [
    {
      code: 'ADMINISTRATOR',
      nameFr: 'Administrateur',
      nameEn: 'Administrator',
      descriptionEn: 'System administrator with full access',
      descriptionFr: 'Administrateur système avec accès complet',
    },
    {
      code: 'ACCOUNTANT',
      nameFr: 'Comptable',
      nameEn: 'Accountant',
      descriptionEn: 'Accounting firm manager',
      descriptionFr: 'Gestionnaire de cabinet comptable',
    },
    {
      code: 'COLLABORATOR',
      nameFr: 'Collaborateur',
      nameEn: 'Collaborator',
      descriptionEn: 'Accounting firm collaborator',
      descriptionFr: 'Collaborateur de cabinet comptable',
    },
    {
      code: 'CLIENT',
      nameFr: 'Client',
      nameEn: 'Client',
      descriptionEn: 'Client of accounting firm',
      descriptionFr: 'Client du cabinet comptable',
    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: role,
      create: role,
    });
  }

  console.log('✅ Roles seeded successfully');
}
