import { Module } from '@nestjs/common';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PrismaModule, AuthModule, NotificationModule],
  // CommonModule and MailModule are @Global() — no need to import here
  controllers: [TaskController],
  providers: [TaskService],
  exports: [TaskService],
})
export class TaskModule {}
