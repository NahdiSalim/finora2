import { Module, forwardRef } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { InvoiceExtractionController } from './invoice-extraction.controller';
import { InvoiceExtractionService } from './invoice-extraction.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { CommonModule } from '../../common/common.module';
import { AuthService } from '../auth/auth.service';
import { MailService } from '../mail/mail.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PrismaModule, CommonModule, forwardRef(() => NotificationModule)],
  controllers: [DocumentController, InvoiceExtractionController],
  providers: [DocumentService, InvoiceExtractionService, AuthService, MailService],
  exports: [DocumentService, InvoiceExtractionService],
})
export class DocumentModule {}
