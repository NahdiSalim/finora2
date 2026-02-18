import { PrismaClient } from '@prisma/client';

export async function seedTasksPermission(prisma: PrismaClient) {
  const pTasks = [
    { role_id: 1, task_id: 1 },
    { role_id: 1, task_id: 2 },
    { role_id: 1, task_id: 3 },
    { role_id: 1, task_id: 4 },
    { role_id: 1, task_id: 5 },
    { role_id: 1, task_id: 6 },
    { role_id: 1, task_id: 7 },
    { role_id: 1, task_id: 8 },
    { role_id: 1, task_id: 9 },
    { role_id: 1, task_id: 10 },
    { role_id: 1, task_id: 11 },
    { role_id: 1, task_id: 12 },
    { role_id: 1, task_id: 13 },
    { role_id: 1, task_id: 14 },
    { role_id: 1, task_id: 15 },
    { role_id: 1, task_id: 16 },
    { role_id: 1, task_id: 17 },
    { role_id: 1, task_id: 18 },
    { role_id: 1, task_id: 19 },
    { role_id: 1, task_id: 20 },
    { role_id: 1, task_id: 21 },
    { role_id: 1, task_id: 22 },
    { role_id: 1, task_id: 23 },
    { role_id: 1, task_id: 24 },
    { role_id: 1, task_id: 25 },
    { role_id: 1, task_id: 26 },
    { role_id: 1, task_id: 27 },
    { role_id: 1, task_id: 28 },
    { role_id: 1, task_id: 29 },
    { role_id: 1, task_id: 30 },
    { role_id: 1, task_id: 31 },
  ];

  for (const pt of pTasks) {
    await prisma.p_tasks.upsert({
      where: {
        role_id_task_id: {
          role_id: pt.role_id,
          task_id: pt.task_id,
        },
      },
      update: {},
      create: pt,
    });
  }
}
