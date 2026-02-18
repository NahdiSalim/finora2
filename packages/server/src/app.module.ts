import { Module } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { TestModule } from './modules/test/test.module';
import { AppController } from './app.controller';
import { ProgrammeModule } from './modules/programme/programme.module';
import { ComparaisonModule } from './modules/comparaison/comparaison.module';
import { MultiComparaisonModule } from './modules/multicomparaison/multicomparaison.module';
import { RoleModule } from './modules/role/role.module';
import { UserModule } from './modules/user/user.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { ProfileComparisonsModule } from './modules/profile-comparisons/profile-comparisons.module';
import { FeatureModule } from './modules/feature/feature.module';
import { CommonModule } from './common/common.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ExtractionModule } from './modules/extraction/extraction.module';
import { ChatModule } from './modules/chat/chat.module';

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
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      },
    }),
    TestModule,
    ProgrammeModule,
    RoleModule,
    UserModule,
    ComparaisonModule,
    MultiComparaisonModule,
    ProfilesModule,
    ProfileComparisonsModule,
    FeatureModule,
    CommonModule,
    AuthModule,
    DashboardModule,
    ExtractionModule,
    ChatModule
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
