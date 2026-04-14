import { Module } from '@nestjs/common';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { MinioService } from '../../common/services/minio.service';
import { AuthService } from '../auth/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MailService } from '../mail/mail.service';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [InvoiceController],
  providers: [InvoiceService, PrismaService, MinioService, AuthService, MailService],
  exports: [InvoiceService],
})
export class InvoiceModule {}
