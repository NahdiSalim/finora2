import { PrismaClient } from '@prisma/client';

export async function seedFeatures(prisma: PrismaClient) {
  const features = [
    { slug: 'Guide Management' },
    {
      slug: 'Dashboard Management',
    },
    { slug: 'Roles Management' },
    { slug: 'Users Management' },
    { slug: 'Programs Management' },
    {
      slug: 'Comparisons Management',
    },
    {
      slug: 'Profile Comparison Management',
    },
    {
      slug: 'Multi Comparison Management',
    },
  ];

  for (const feature of features) {
    await prisma.feature.upsert({
      where: { slug: feature.slug },
      update: {
        slug: feature.slug,
      },
      create: {
        slug: feature.slug,
      },
    });
  }
}
