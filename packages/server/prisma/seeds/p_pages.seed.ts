import { PrismaClient } from '@prisma/client';

export async function seedPagePermission(prisma: PrismaClient) {
  const pPages = [
    { role_id: 1, page_id: 1 },
    { role_id: 1, page_id: 2 },
    { role_id: 1, page_id: 3 },
    { role_id: 1, page_id: 4 },
    { role_id: 1, page_id: 5 },
    { role_id: 1, page_id: 6 },
    { role_id: 1, page_id: 7 },
    { role_id: 1, page_id: 8 },
    { role_id: 1, page_id: 9 },
    { role_id: 1, page_id: 10 },
    { role_id: 1, page_id: 11 },
    { role_id: 1, page_id: 12 },
    { role_id: 1, page_id: 13 },
    { role_id: 1, page_id: 14 },
    { role_id: 1, page_id: 15 },
    { role_id: 1, page_id: 16 },
    { role_id: 1, page_id: 17 },
    { role_id: 1, page_id: 18 },
    { role_id: 1, page_id: 19 },
  ];

  for (const pp of pPages) {
    await prisma.p_pages.upsert({
      where: {
        role_id_page_id: {
          role_id: pp.role_id,
          page_id: pp.page_id,
        },
      },
      update: {},
      create: pp,
    });
  }

  console.log('p_pages seeding completed!');
}
