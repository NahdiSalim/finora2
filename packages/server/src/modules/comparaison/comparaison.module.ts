import { Module } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { ComparaisonController } from './comparaison.controller';
import { ComparaisonService } from './comparaison.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ComparaisonController],
  providers: [ComparaisonService, PrismaService],
  exports: [ComparaisonService],
})
export class ComparaisonModule {}
