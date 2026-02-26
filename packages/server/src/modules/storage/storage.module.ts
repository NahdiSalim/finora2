import { Module } from '@nestjs/common';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthService } from '../auth/auth.service';
import { HashService } from 'src/common/crypto/hash.service';
import { JwtTokenService } from 'src/common/jwt/jwt-token.service';
import { MailService } from '../mail/mail.service';
import { FileUploadService } from 'src/common/services/file-upload.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [PrismaModule],
  controllers: [StorageController],
  providers: [
    StorageService,
    AuthService,
    HashService,
    JwtTokenService,
    MailService,
    FileUploadService,
    JwtService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
