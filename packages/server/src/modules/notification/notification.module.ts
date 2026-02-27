import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtModule } from '@nestjs/jwt';
import { NotificationController } from './notification.controller';
import { NotificationGateway } from './notification.gateway';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthService } from '../auth/auth.service';
import { HashService } from 'src/common/crypto/hash.service';
import { JwtTokenService } from 'src/common/jwt/jwt-token.service';
import { MailService } from '../mail/mail.service';
import { FileUploadService } from 'src/common/services/file-upload.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationGateway,
    AuthService,
    HashService,
    JwtTokenService,
    MailService,
    FileUploadService,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
