import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MailService } from '../mail/mail.service';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [ProductController],
  providers: [ProductService, PrismaService, AuthService, MailService],
  exports: [ProductService],
})
export class ProductModule {}
