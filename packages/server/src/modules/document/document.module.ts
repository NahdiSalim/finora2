import { Module } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { CommonModule } from '../../common/common.module';
import { AuthService } from '../auth/auth.service';
import { MailService } from '../mail/mail.service';
// import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [PrismaModule, CommonModule], // StorageModule temporairement désactivé
  controllers: [DocumentController],
  providers: [DocumentService, AuthService, MailService],
  exports: [DocumentService],
})
export class DocumentModule {}
