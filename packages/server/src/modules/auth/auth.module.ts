import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CommonModule } from '../../common/common.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaModule } from '../../../prisma/prisma.module';
import { PermissionGuard } from './guards/permission.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    CommonModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    PrismaModule,
    MailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, PermissionGuard, JwtAuthGuard],
  exports: [
    AuthService,
    JwtStrategy,
    PassportModule,
    PermissionGuard,
    JwtAuthGuard,
  ],
})
export class AuthModule {}
