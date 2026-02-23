import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from 'prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { AuthService } from '../auth/auth.service';
import { HashService } from 'src/common/crypto/hash.service';
import { JwtTokenService } from 'src/common/jwt/jwt-token.service';
import { JwtService } from '@nestjs/jwt';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [PrismaModule, MailModule, CommonModule],
  controllers: [AdminController],
  providers: [AdminService, AuthService, HashService, JwtTokenService, JwtService],
  exports: [AdminService],
})
export class AdminModule {}
