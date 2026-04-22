import { Module } from '@nestjs/common';
import { BonLivraisonController } from './bon-livraison.controller';
import { BonLivraisonService } from './bon-livraison.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MailService } from '../mail/mail.service';
import { MinioService } from '../../common/services/minio.service';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [BonLivraisonController],
  providers: [BonLivraisonService, PrismaService, AuthService, MailService, MinioService],
  exports: [BonLivraisonService],
})
export class BonLivraisonModule {}
