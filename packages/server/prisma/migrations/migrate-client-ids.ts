import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});

const prisma = new PrismaClient({ adapter });

async function migrateClientIds() {
  console.log('Starting client ID migration...');

  try {
    console.log('Creating task_clients table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "task_clients" (
        "id" SERIAL NOT NULL,
        "taskId" INTEGER NOT NULL,
        "clientId" INTEGER NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "task_clients_pkey" PRIMARY KEY ("id")
      );
    `;

    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "task_clients_taskId_clientId_key" ON "task_clients"("taskId", "clientId");
    `;

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "task_clients_taskId_idx" ON "task_clients"("taskId");
    `;

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "task_clients_clientId_idx" ON "task_clients"("clientId");
    `;

    // Add foreign key constraints (wrap in DO block to handle if exists)
    await prisma.$executeRaw`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'task_clients_taskId_fkey'
        ) THEN
          ALTER TABLE "task_clients" ADD CONSTRAINT "task_clients_taskId_fkey" 
          FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `;

    await prisma.$executeRaw`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'task_clients_clientId_fkey'
        ) THEN
          ALTER TABLE "task_clients" ADD CONSTRAINT "task_clients_clientId_fkey" 
          FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `;

    console.log('task_clients table created successfully');

    // Get all tasks with clientId
    const tasksWithClients: any[] = await prisma.$queryRaw`
      SELECT id, "clientId" 
      FROM "Task" 
      WHERE "clientId" IS NOT NULL
    `;

    console.log(`Found ${tasksWithClients.length} tasks with clientId`);

    // Migrate each task's clientId to task_clients
    for (const task of tasksWithClients) {
      await prisma.$executeRaw`
        INSERT INTO "task_clients" ("taskId", "clientId", "createdAt")
        VALUES (${task.id}, ${task.clientId}, NOW())
        ON CONFLICT ("taskId", "clientId") DO NOTHING
      `;
      console.log(`Migrated task ${task.id} -> client ${task.clientId}`);
    }

    console.log('Migration completed successfully!');
    console.log(`Migrated ${tasksWithClients.length} client relationships`);
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateClientIds()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
