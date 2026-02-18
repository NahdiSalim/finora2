import { Module } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { ComparaisonModule } from '../comparaison/comparaison.module';
import { MultiComparaisonController } from './multicomparaison.controller';
import { MultiComparaisonService } from './multicomparaison.service';
import { AuthModule } from '../auth/auth.module';
import { ComparaisonService } from '../comparaison/comparaison.service';

@Module({
  imports: [ComparaisonModule, AuthModule],
  controllers: [MultiComparaisonController],
  providers: [MultiComparaisonService, PrismaService , ComparaisonService],
  exports: [MultiComparaisonService],
})
export class MultiComparaisonModule {}
