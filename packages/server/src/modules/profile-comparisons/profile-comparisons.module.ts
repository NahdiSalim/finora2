import { Module } from '@nestjs/common';
import { ProfileComparisonsService } from './profile-comparisons.service';
import { ProfileComparisonsController } from './profile-comparisons.controller';
import { PrismaService } from 'prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ProfileComparisonsController],
  providers: [ProfileComparisonsService, PrismaService],
})
export class ProfileComparisonsModule {}
