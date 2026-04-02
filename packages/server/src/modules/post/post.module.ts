import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  // CommonModule and MailModule are @Global() — no need to import here
  controllers: [PostController],
  providers: [PostService],
  exports: [PostService],
})
export class PostModule {}
