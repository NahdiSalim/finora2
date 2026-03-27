import { Module, forwardRef } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { InvoiceExtractionController } from './invoice-extraction.controller';
import { InvoiceExtractionService } from './invoice-extraction.service';
import { DocumentVersionController } from './document-version.controller';
import { DocumentVersionService } from './document-version.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [PrismaModule, CommonModule, forwardRef(() => NotificationModule)],
  controllers: [DocumentController, InvoiceExtractionController, DocumentVersionController],
  providers: [
    DocumentService,
    InvoiceExtractionService,
    DocumentVersionService,
    AuthService,
    MailService,
  ],
  exports: [DocumentService, InvoiceExtractionService, DocumentVersionService],
})
export class DocumentModule {}
