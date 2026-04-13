import { Module, forwardRef } from '@nestjs/common';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { DocumentModule } from '../document/document.module';

@Module({
  imports: [PrismaModule, AuthModule, forwardRef(() => DocumentModule)],
  controllers: [InvoiceController],
  providers: [InvoiceService],
  exports: [InvoiceService],
})
export class InvoiceModule {}
