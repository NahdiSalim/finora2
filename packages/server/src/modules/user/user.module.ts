import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.serivce';
import { PrismaService } from 'prisma/prisma.service';
import { CommonModule } from 'src/common/common.module';
import { HashModule } from 'src/common/crypto/hash.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [CommonModule, HashModule, AuthModule],
  controllers: [UserController],
  providers: [UserService, PrismaService],
  exports: [PrismaService],
})
export class UserModule {}
