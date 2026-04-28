import { Module } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { MailModule } from './modules/mail/mail.module';
import { RoleModule } from './modules/role/role.module';
import { UserModule } from './modules/user/user.module';
import { CommonModule } from './common/common.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { AccountantModule } from './modules/accountant/accountant.module';
import { DocumentModule } from './modules/document/document.module';
import { StorageModule } from './modules/storage/storage.module';
import { TaskModule } from './modules/task/task.module';
import { RequestModule } from './modules/request/request.module';
import { AppointmentModule } from './modules/appointment/appointment.module';
import { ChatModule } from './modules/chat/chat.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationModule } from './modules/notification/notification.module';
import { PostModule } from './modules/post/post.module';
import { ReviewModule } from './modules/review/review.module';
import { ContactModule } from './modules/contact/contact.module';
import { RelationshipModule } from './modules/relationship/relationship.module';
import { LocationModule } from './modules/location/location.module';
import { DevisModule } from './modules/devis/devis.module';
import { InvoiceModule } from './modules/invoice/invoice.module';
import { SupplierModule } from './modules/supplier/supplier.module';
import { BonCommandeModule } from './modules/bon-commande/bon-commande.module';
import { BonLivraisonModule } from './modules/bon-livraison/bon-livraison.module';
import { ProductModule } from './modules/product/product.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('THROTTLE_TTL') || 60000,
            limit: config.get<number>('THROTTLE_LIMIT') || 60,
          },
        ],
      }),
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'silent',
      },
    }),
    RoleModule,
    UserModule,
    CommonModule,
    MailModule,
    AuthModule,
    AdminModule,
    AccountantModule,
    DocumentModule,
    StorageModule,
    TaskModule,
    RequestModule,
    AppointmentModule,
    ChatModule,
    AuditModule,
    NotificationModule,
    PostModule,
    ReviewModule,
    ContactModule,
    RelationshipModule,
    LocationModule,
    DevisModule,
    InvoiceModule,
    SupplierModule,
    BonCommandeModule,
    BonLivraisonModule,
    ProductModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
