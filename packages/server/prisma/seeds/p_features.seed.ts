import { PrismaClient } from '@prisma/client';

export async function seedFeaturePermission(prisma: PrismaClient) {
  const pFeatures = [
    { role_id: 1, feature_id: 1 },
    { role_id: 1, feature_id: 2 },
    { role_id: 1, feature_id: 3 },
    { role_id: 1, feature_id: 4 },
    { role_id: 1, feature_id: 5 },
    { role_id: 1, feature_id: 6 },
    { role_id: 1, feature_id: 7 },
    { role_id: 1, feature_id: 8 },
  ];

  for (const pf of pFeatures) {
    await prisma.p_features.upsert({
      where: {
        role_id_feature_id: {
          role_id: pf.role_id,
          feature_id: pf.feature_id,
        },
      },
      update: {}, // ✅ NOTHING to update
      create: {
        role_id: pf.role_id,
        feature_id: pf.feature_id,
      },
    });
  }
}
