import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { PrismaService } from '../../../prisma/prisma.service';
import { CommonModule } from '../../common/common.module';
import { JwtService } from '@nestjs/jwt';
import { HashService } from 'src/common/crypto/hash.service';
import { JwtTokenService } from 'src/common/jwt/jwt-token.service';
import { FileUploadService } from 'src/common/services/file-upload.service';
import { AuthService } from '../auth/auth.service';
import { MailService } from '../mail/mail.service';

@Module({
  imports: [CommonModule],
  controllers: [PostController],
  providers: [
    PostService,
    PrismaService,
    AuthService,
    HashService,
    JwtTokenService,
    MailService,
    FileUploadService,
    JwtService,
  ],
  exports: [PostService],
})
export class PostModule {}
