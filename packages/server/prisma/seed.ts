import { PrismaClient } from '@prisma/client';
import { seedFeatures } from './seeds/features.seed';
import { seedRoles } from './seeds/role.seed';
import { seedPages } from './seeds/pages.seed';
import { seedActions } from './seeds/actions.seed';
import { seedUsers } from './seeds/users.seed';
import { seedRolePermissions } from './seeds/role-permissions.seed';
import { PrismaPg } from '@prisma/adapter-pg';

export const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  }),
});

async function main() {
  try {
    console.log('🌱 Starting database seeding...\n');

    await seedRoles(prisma);
    await seedFeatures(prisma);
    await seedPages(prisma);
    await seedActions(prisma);
    await seedUsers(prisma);
    await seedRolePermissions(prisma);

    console.log('\n✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
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
