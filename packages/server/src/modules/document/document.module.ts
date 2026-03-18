import { Module, forwardRef } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { InvoiceExtractionController } from './invoice-extraction.controller';
import { InvoiceExtractionService } from './invoice-extraction.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { CommonModule } from '../../common/common.module';
import { AuthService } from '../auth/auth.service';
import { MailService } from '../mail/mail.service';
// import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [PrismaModule, CommonModule], // StorageModule temporairement désactivé
  controllers: [DocumentController, InvoiceExtractionController],
  providers: [DocumentService, InvoiceExtractionService, AuthService, MailService],
  exports: [DocumentService, InvoiceExtractionService],
})
export class DocumentModule {}
