import { Module } from '@nestjs/common';
import {
  AccountantController,
  PublicAccountantsController,
  AccountantProfileController,
} from './accountant.controller';
import { AccountantService } from './accountant.service';
import { PrismaModule } from 'prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  // CommonModule and MailModule are @Global() — no need to import here
  controllers: [AccountantController, PublicAccountantsController, AccountantProfileController],
  providers: [AccountantService],
  exports: [AccountantService],
})
export class AccountantModule {}
