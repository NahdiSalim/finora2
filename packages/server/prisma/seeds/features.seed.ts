import { PrismaClient } from '@prisma/client';

export async function seedFeatures(prisma: PrismaClient) {
  const features = [
    { slug: 'gestion-utilisateurs' },
    { slug: 'dashboard' },
    { slug: 'gestion-comptes-comptables' },
    { slug: 'archive' },
    { slug: 'gestion-documents' },
    { slug: 'gestion-rendez-vous' },
    { slug: 'gestion-demandes' },
    { slug: 'messagerie' },
    { slug: 'mes-banques' },
    { slug: 'reseautage' },
    { slug: 'profil' },
    { slug: 'gestion-collaborateurs' },
    { slug: 'gestion-taches' },
    { slug: 'gestion-clients' },
  ];

  for (const feature of features) {
    await prisma.feature.upsert({
      where: { slug: feature.slug },
      update: { slug: feature.slug },
      create: { slug: feature.slug },
    });
  }

  console.log(' Features seeded successfully');
}
