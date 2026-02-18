import { PrismaClient } from '@prisma/client';

export async function seedPages(prisma: PrismaClient) {
  const pages = [
    {
      PageUrl: '/user',
      slug: 'view_all_users',
      featureId: 4,
    },
    {
      PageUrl: '/guide',
      slug: 'guide',
      featureId: 1,
    },
    {
      PageUrl: '/role',
      slug: 'Roles',
      featureId: 3,
    },
    {
      PageUrl: '/programme',
      slug: 'view_all_programs',
      featureId: 5,
    },
    {
      PageUrl: '/programme/add/:type',
      slug: 'view_all_programs/add_program',
      featureId: 5,
    },
    {
      PageUrl: '/programme/view-detail-program/:id',
      slug: 'view_detail_program',
      featureId: 5,
    },
    {
      PageUrl: '/programme/edit/:id',
      slug: 'edit_program',
      featureId: 5,
    },
    {
      PageUrl: '/comparaisons',
      slug: 'Comparisons',
      featureId: 6,
    },
    {
      PageUrl: '/comparaisons/view-detail-comparison/:id',
      slug: 'view_detail_comparison',
      featureId: 6,
    },
    {
      PageUrl: '/comparaisons/PreComparaison',
      slug: 'add_comparisons',
      featureId: 6,
    },
    {
      PageUrl: '/comparaisons/edit-comparison/:id',
      slug: 'edit_comparison',
      featureId: 6,
    },

    {
      PageUrl: '/comparaisons/profils',
      slug: 'view__Profile_comparison',
      featureId: 7,
    },
    {
      PageUrl: '/comparaisons/profils/add',
      slug: 'add_Profile_comparisons',
      featureId: 7,
    },
    {
      PageUrl: '/comparaisons/profils/show/:id',
      slug: 'view_detail_Profile_comparison',
      featureId: 7,
    },
    {
      PageUrl: '/comparaisons/multidimensionnelles',
      slug: 'view_all_Multi_comparisons',
      featureId: 8,
    },
    {
      PageUrl: '/comparaisons/multidimensionnelles/PreMultiComparaison',
      slug: 'add_Multi_comparisons',
      featureId: 8,
    },
    {
      PageUrl:
        '/comparaisons/multidimensionnelles/view-detail-MultiComparison/:id',
      slug: 'view_detail_Multi_comparison',
      featureId: 8,
    },
    {
      PageUrl: '/comparaisons/multidimensionnelles/edit-multicomparison/:id',
      slug: 'edit_multicomparison',
      featureId: 8,
    },
    {
      PageUrl: '/dashboard',
      slug: 'dashboard',
      featureId: 2,
    },
  ];

  for (const page of pages) {
    await prisma.pages.upsert({
      where: { slug: page.slug },
      update: {
        PageUrl: page.PageUrl,
        featureId: page.featureId,
      },
      create: {
        PageUrl: page.PageUrl,
        slug: page.slug,
        featureId: page.featureId,
      },
    });
  }
}
