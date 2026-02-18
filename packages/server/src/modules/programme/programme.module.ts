import { Module } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { ProgrammeController } from './programme.controller';
import { ProgrammeService } from './programme.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ProgrammeController],
  providers: [ProgrammeService, PrismaService],
})
export class ProgrammeModule {}
