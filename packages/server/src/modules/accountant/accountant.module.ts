import { Module } from '@nestjs/common';
import {
  AccountantController,
  PublicAccountantsController,
  AccountantProfileController,
} from './accountant.controller';
import { AccountantService } from './accountant.service';
import { PrismaModule } from 'prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [PrismaModule, AuthModule, ChatModule],
  // CommonModule and MailModule are @Global() — no need to import here
  controllers: [AccountantController, PublicAccountantsController, AccountantProfileController],
  providers: [AccountantService, JwtService],
  exports: [AccountantService],
})
export class AccountantModule {}
