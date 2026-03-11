import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AutoSeedService implements OnModuleInit {
  private readonly logger = new Logger(AutoSeedService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    // Attendre un peu que Prisma soit complètement initialisé
    setTimeout(() => {
      this.ensureClientManagementFeature().catch((error) => {
        this.logger.error(' Erreur auto-seed:', error.message);
        this.logger.log(
          ' Utilisez MANUAL_ADD_CLIENT_FEATURE.sql pour ajouter manuellement la feature'
        );
      });
    }, 3000); // Attendre 3 secondes
  }

  private async ensureClientManagementFeature() {
    try {
      // Vérifier si la feature existe déjà
      const existingFeature = await this.prisma.feature.findFirst({
        where: { slug: 'gestion-clients' },
      });

      if (existingFeature) {
        this.logger.log(' Feature "gestion-clients" déjà présente');
        return;
      }

      this.logger.log(' Ajout de la feature "gestion-clients"...');

      // 1. Créer la feature
      const feature = await this.prisma.feature.create({
        data: { slug: 'gestion-clients' },
      });

      // 2. Créer les pages
      const pageClientsList = await this.prisma.pages.create({
        data: {
          PageUrl: '/clients',
          slug: 'clients-list',
          featureId: feature.id,
        },
      });

      const pageClientDetail = await this.prisma.pages.create({
        data: {
          PageUrl: '/clients/:id',
          slug: 'client-detail',
          featureId: feature.id,
        },
      });

      // 3. Créer les actions
      const actions = await Promise.all([
        this.prisma.action.create({
          data: {
            name: 'Voir la liste des clients',
            code: 'VIEW_CLIENTS',
            category: 'read',
            pageId: pageClientsList.id,
          },
        }),
        this.prisma.action.create({
          data: {
            name: 'Créer un client',
            code: 'CREATE_CLIENT',
            category: 'write',
            pageId: pageClientsList.id,
          },
        }),
        this.prisma.action.create({
          data: {
            name: "Voir le détail d'un client",
            code: 'VIEW_CLIENT_DETAIL',
            category: 'read',
            pageId: pageClientDetail.id,
          },
        }),
        this.prisma.action.create({
          data: {
            name: 'Modifier un client',
            code: 'UPDATE_CLIENT',
            category: 'write',
            pageId: pageClientDetail.id,
          },
        }),
        this.prisma.action.create({
          data: {
            name: 'Supprimer un client',
            code: 'DELETE_CLIENT',
            category: 'write',
            pageId: pageClientDetail.id,
          },
        }),
      ]);

      // 4. Récupérer le rôle comptable
      const accountantRole = await this.prisma.role.findUnique({
        where: { code: 'ACCOUNTANT' },
      });

      if (!accountantRole) {
        this.logger.warn('  Rôle ACCOUNTANT introuvable');
        return;
      }

      // 5. Assigner les permissions
      await Promise.all(
        actions.map((action) =>
          this.prisma.roleAction.create({
            data: {
              roleId: accountantRole.id,
              actionId: action.id,
            },
          })
        )
      );

      // 6. Assigner les pages
      await Promise.all([
        this.prisma.p_pages.create({
          data: {
            role_id: accountantRole.id,
            page_id: pageClientsList.id,
          },
        }),
        this.prisma.p_pages.create({
          data: {
            role_id: accountantRole.id,
            page_id: pageClientDetail.id,
          },
        }),
      ]);

      // 7. Assigner la feature
      await this.prisma.p_features.create({
        data: {
          role_id: accountantRole.id,
          feature_id: feature.id,
        },
      });

      this.logger.log(' Feature "gestion-clients" ajoutée avec succès au rôle ACCOUNTANT');
      this.logger.log('   - 1 feature créée');
      this.logger.log('   - 2 pages créées');
      this.logger.log('   - 5 actions créées');
      this.logger.log('   - Permissions assignées au comptable');
    } catch (error) {
      // Si l'erreur est due à une contrainte unique, c'est OK (déjà existant)
      if (error.code === 'P2002') {
        this.logger.log(' Feature "gestion-clients" déjà présente');
      } else {
        this.logger.error(" Erreur lors de l'ajout de la feature:", error.message);
      }
    }
  }
}
