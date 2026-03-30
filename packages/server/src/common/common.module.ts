import { Global, Module } from '@nestjs/common';
import { HashService } from './crypto/hash.service';
import { JwtTokenService } from './jwt/jwt-token.service';
import { FileUploadService } from './services/file-upload.service';
import { MinioService } from './services/minio.service';
import { AutoSeedService } from './services/auto-seed.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { HashModule } from './crypto/hash.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Global()
@Module({
  imports: [JwtModule.register({}), HashModule, ConfigModule, PrismaModule],
  providers: [HashService, JwtTokenService, FileUploadService, MinioService, AutoSeedService],
  exports: [JwtTokenService, HashModule, FileUploadService, MinioService],
})
export class CommonModule {}
