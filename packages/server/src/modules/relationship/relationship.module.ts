import { Module } from '@nestjs/common';
import { RelationshipController } from './relationship.controller';
import { RelationshipService } from './relationship.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { JwtService } from '@nestjs/jwt';
import { HashService } from 'src/common/crypto/hash.service';
import { JwtTokenService } from 'src/common/jwt/jwt-token.service';
import { FileUploadService } from 'src/common/services/file-upload.service';
import { AuthService } from '../auth/auth.service';
import { MailService } from '../mail/mail.service';
import { MinioService } from 'src/common/services/minio.service';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [RelationshipController],
  providers: [
    RelationshipService,
    AuthService,
    HashService,
    JwtTokenService,
    MailService,
    FileUploadService,
    JwtService,
    MinioService,
  ],
  exports: [RelationshipService],
})
export class RelationshipModule {}
