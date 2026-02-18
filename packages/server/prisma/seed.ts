import { PrismaClient } from '@prisma/client';
import { seedFeatures } from './seeds/features.seed';
import { seedRoles } from './seeds/role.seed';
import { seedPages } from './seeds/pages.seed';
import { seedTasks } from './seeds/tasks.seed';
import { seedFeaturePermission } from './seeds/p_features.seed';
import { seedPagePermission } from './seeds/p_pages.seed';
import { seedTasksPermission } from './seeds/p_tasks.seed';
import { PrismaPg } from '@prisma/adapter-pg';

export const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  }),
});

async function main() {
  try {
    await seedRoles(prisma);
    await seedFeatures(prisma);
    await seedPages(prisma);
    await seedTasks(prisma);
    await seedFeaturePermission(prisma);
    await seedPagePermission(prisma);
    await seedTasksPermission(prisma);
    console.log('\n✅ Database seeding completed successfully!');
  } catch (error) {
    console.error(' Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
