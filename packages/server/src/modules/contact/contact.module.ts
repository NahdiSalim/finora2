import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  // CommonModule and MailModule are @Global() — no need to import here
  controllers: [ContactController],
  providers: [ContactService],
  exports: [ContactService],
})
export class ContactModule {}
