import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaModule } from '../../../prisma/prisma.module';
import { PermissionGuard } from './guards/permission.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    PrismaModule,
    // CommonModule and MailModule are @Global() — no need to import here
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, PermissionGuard, JwtAuthGuard],
  exports: [AuthService, JwtStrategy, PassportModule, PermissionGuard, JwtAuthGuard],
})
export class AuthModule {}
