/**
 * Demo/report seed — refreshes requests & tasks for screenshots.
 * Run: pnpm seed:demo
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { seedRequests } from './seeds/requests.seed';
import { seedTasks } from './seeds/tasks.seed';
import { seedMessaging } from './seeds/messaging.seed';
import { seedFinance } from './seeds/finance.seed';
import { seedClientAccountingRelationship } from './seeds/relationship.seed';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

async function main() {
  console.log('📸 Seeding demo data for report screenshots...\n');
  await seedClientAccountingRelationship(prisma);
  const force = true;
  await seedRequests(prisma, force);
  await seedTasks(prisma, force);
  await seedMessaging(prisma, force);
  await seedFinance(prisma, force);
  console.log('\n✅ Demo seed completed! Log in as:');
  console.log('   client@finora.com / password123');
  console.log('   comptable@finora.com / password123');
  console.log('   collaborateur@finora.com / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
