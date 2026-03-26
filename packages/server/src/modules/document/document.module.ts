import { Module, forwardRef } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { InvoiceExtractionController } from './invoice-extraction.controller';
import { InvoiceExtractionService } from './invoice-extraction.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PrismaModule, AuthModule, forwardRef(() => NotificationModule)],
  // CommonModule and MailModule are @Global() — no need to import here
  controllers: [DocumentController, InvoiceExtractionController],
  providers: [DocumentService, InvoiceExtractionService],
  exports: [DocumentService, InvoiceExtractionService],
})
export class DocumentModule {}
