import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.serivce';
import { PrismaModule } from 'prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  // CommonModule is @Global() — no need to import here
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
