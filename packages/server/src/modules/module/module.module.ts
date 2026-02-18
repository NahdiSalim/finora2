import { Module } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ModuleController } from './module.controller';
import { ModuleService } from './module.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ModuleController],
  providers: [ModuleService, PrismaService],
})
export class ModuleModule {}
