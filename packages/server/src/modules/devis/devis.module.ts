import { Module } from '@nestjs/common';
import { DevisController } from './devis.controller';
import { DevisService } from './devis.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { MinioService } from '../../common/services/minio.service';
import { AuthService } from '../auth/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MailService } from '../mail/mail.service';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [DevisController],
  providers: [DevisService, PrismaService, MinioService, AuthService, MailService],
  exports: [DevisService],
})
export class DevisModule {}
