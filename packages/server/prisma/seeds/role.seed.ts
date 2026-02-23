import { PrismaClient } from '@prisma/client';

export async function seedRoles(prisma: PrismaClient) {
  const roles = [
    {
      id: 1,
      nameFr: 'admin',
      nameEn: 'administrator',
      descriptionEn: ' role for admin ',
      descriptionFr: ' role pour administrateur',
    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { id: role.id },
      update: {},
      create: role,
    });
  }
}
