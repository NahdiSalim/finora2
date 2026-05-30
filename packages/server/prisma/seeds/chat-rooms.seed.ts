import { PrismaClient } from '@prisma/client';
import { seedMessaging } from './messaging.seed';

/** @deprecated Use seedMessaging — kept for seed.ts import compatibility */
export async function seedChatRooms(prisma: PrismaClient) {
  await seedMessaging(prisma, false);
}
