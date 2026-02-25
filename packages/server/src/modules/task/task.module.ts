import { Module } from '@nestjs/common';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { CommonModule } from '../../common/common.module';
import { AuthService } from '../auth/auth.service';
import { MailService } from '../mail/mail.service';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [TaskController],
  providers: [TaskService, AuthService, MailService],
  exports: [TaskService],
})
export class TaskModule {}
