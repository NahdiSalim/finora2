import { PrismaClient } from '@prisma/client';

export async function seedRoles(prisma: PrismaClient) {
  const roles = [
    {
      id: 1,
      nameFr: 'admin',
      nameEn: 'administrator',
      descriptionEn: 'role for admin',
      descriptionFr: 'role pour administrateur',
    },
    {
      id: 2,
      nameFr: 'utilisateur',
      nameEn: 'user',
      descriptionEn: 'standard user role',
      descriptionFr: 'rôle utilisateur standard',
    },
    {
      id: 3,
      nameFr: 'gestionnaire',
      nameEn: 'manager',
      descriptionEn: 'manager role',
      descriptionFr: 'rôle gestionnaire',
    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { id: role.id },
      update: {},
      create: role,
    });
  }

  console.log('✅ Roles seeded successfully');
}
