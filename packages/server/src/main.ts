import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync } from 'fs';
import { setupSwagger } from './config/swagger';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors();
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(rateLimit({ windowMs: 60000, max: 100 }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false,
      forbidNonWhitelisted: false,
      transform: true,
      skipMissingProperties: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  if (process.env.NODE_ENV !== 'production') {
    setupSwagger(app);
  }

  // Fix path for both dev (src) and prod (dist)
  const uploadsPath = join(__dirname, '..', '..', 'uploads');
  if (!existsSync(uploadsPath)) {
    console.error('Uploads folder not found at:', uploadsPath);
  } else {
    console.log('Serving uploads from:', uploadsPath);
  }
  app.useStaticAssets(uploadsPath, {
    prefix: '/uploads/',
  });

  await app.listen(process.env.PORT || 3000, '0.0.0.0');
  console.log(`server is listening on port ${process.env.PORT || 3000}`);
  console.log(`API → http://localhost:${process.env.PORT || 3000}/api`);
}
bootstrap();
