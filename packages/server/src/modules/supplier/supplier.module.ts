import { Module } from '@nestjs/common';
import { SupplierController } from './supplier.controller';
import { SupplierService } from './supplier.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { MinioService } from '../../common/services/minio.service';
import { AuthService } from '../auth/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MailService } from '../mail/mail.service';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [SupplierController],
  providers: [SupplierService, PrismaService, MinioService, AuthService, MailService],
  exports: [SupplierService],
})
export class SupplierModule {}
