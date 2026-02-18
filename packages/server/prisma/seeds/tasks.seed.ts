import { PrismaClient } from '@prisma/client';

export async function seedTasks(prisma: PrismaClient) {
  const Permissiontasks = [
    {
      id: 1,
      slug: 'view_user',
      id_page: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      slug: 'view_detail_user',
      id_page: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 3,
      slug: 'delete_user',
      id_page: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 4,
      slug: 'add_user',
      id_page: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 5,
      slug: 'edit_user',
      id_page: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // role
    {
      id: 6,
      slug: 'view_role',
      id_page: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 7,
      slug: 'view_detail_role',
      id_page: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 8,
      slug: 'delete_role',
      id_page: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 9,
      slug: 'add_role',
      id_page: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 10,
      slug: 'edit_role',
      id_page: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // guide
    {
      id: 11,
      slug: 'view_guide',
      id_page: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    },

    // program
    {
      id: 12,
      slug: 'view_program',
      id_page: 4,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 13,
      slug: 'view_detail_program',
      id_page: 6,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 14,
      slug: 'delete_program',
      id_page: 4,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 15,
      slug: 'add_program',
      id_page: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 16,
      slug: 'edit_program',
      id_page: 7,
      createdAt: new Date(),
      updatedAt: new Date(),
    },

    // comparison
    {
      id: 17,
      slug: 'view_comparison',
      id_page: 8,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 18,
      slug: 'view_detail_comparison',
      id_page: 9,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 19,
      slug: 'delete_comparison',
      id_page: 8,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 20,
      slug: 'add_comparison',
      id_page: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 21,
      slug: 'edit_comparison',
      id_page: 11,
      createdAt: new Date(),
      updatedAt: new Date(),
    },

    // profile comparison
    {
      id: 22,
      slug: 'view_profile_comparison',
      id_page: 12,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 23,
      slug: 'view_detail_profile_comparison',
      id_page: 14,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 24,
      slug: 'delete_profile_comparison',
      id_page: 12,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 25,
      slug: 'add_profile_comparison',
      id_page: 13,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // multi comparison
    {
      id: 26,
      slug: 'view_multi_comparison',
      id_page: 15,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 27,
      slug: 'view_detail_multi_comparison',
      id_page: 17,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 28,
      slug: 'delete_multi_comparison',
      id_page: 15,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 29,
      slug: 'add_multi_comparison',
      id_page: 16,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 30,
      slug: 'edit_multi_comparison',
      id_page: 18,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 31,
      slug: 'view_dashboard',
      id_page: 19,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  for (const task of Permissiontasks) {
    await prisma.tasks.upsert({
      where: { id: task.id },
      update: {},
      create: task,
    });
  }
}
