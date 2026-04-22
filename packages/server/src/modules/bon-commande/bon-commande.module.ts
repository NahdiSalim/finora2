import { Module } from '@nestjs/common';
import { BonCommandeController } from './bon-commande.controller';
import { BonCommandeService } from './bon-commande.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MailService } from '../mail/mail.service';
import { MinioService } from '../../common/services/minio.service';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [BonCommandeController],
  providers: [BonCommandeService, PrismaService, AuthService, MailService, MinioService],
  exports: [BonCommandeService],
})
export class BonCommandeModule {}
