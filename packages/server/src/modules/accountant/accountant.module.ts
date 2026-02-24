import { Module } from '@nestjs/common';
import { AccountantController } from './accountant.controller';
import { AccountantService } from './accountant.service';
import { PrismaModule } from 'prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { AuthService } from '../auth/auth.service';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [PrismaModule, MailModule, CommonModule],
  controllers: [AccountantController],
  providers: [AccountantService, AuthService],
  exports: [AccountantService],
})
export class AccountantModule {}
