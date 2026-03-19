import { Module } from '@nestjs/common';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { CommonModule } from '../../common/common.module';
import { AuthService } from '../auth/auth.service';
import { MailService } from '../mail/mail.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationGateway } from '../notification/notification.gateway';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [TaskController],
  providers: [
    TaskService,
    AuthService,
    MailService,
    NotificationService,
    NotificationGateway,
    JwtService,
    ConfigService,
  ],
  exports: [TaskService],
})
export class TaskModule {}
