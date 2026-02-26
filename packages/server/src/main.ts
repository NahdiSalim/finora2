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
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { seedRoles } from '../prisma/seeds/role.seed';
import { seedFeatures } from '../prisma/seeds/features.seed';
import { seedPages } from '../prisma/seeds/pages.seed';
import { seedActions } from '../prisma/seeds/actions.seed';
import { seedUsers } from '../prisma/seeds/users.seed';
import { seedRolePermissions } from '../prisma/seeds/role-permissions.seed';

async function runSeeds() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL!,
    }),
  });

  try {
    console.log('🌱 Running database seeds...');

    // Check if data already exists
    const rolesCount = await prisma.role.count();
    if (rolesCount > 0) {
      console.log('✅ Database already seeded, skipping...');
      await prisma.$disconnect();
      return;
    }

    await seedRoles(prisma);
    await seedFeatures(prisma);
    await seedPages(prisma);
    await seedActions(prisma);
    await seedUsers(prisma);
    await seedRolePermissions(prisma);

    console.log('✅ Database seeding completed!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
app.set('trust proxy', 1);
  // CORS configuration - doit être avant tout
  app.enableCors({
    origin: true, // Permet toutes les origines en dev, à configurer en prod
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  app.setGlobalPrefix('api');

  // Helmet avec configuration pour Swagger
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'", 'http:'],
          styleSrc: ["'self'", "'unsafe-inline'", 'http:'],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'http:'],
          imgSrc: ["'self'", 'data:', 'http:', 'https:'],
        },
      },

      crossOriginEmbedderPolicy: false,

      strictTransportSecurity: false,
      crossOriginOpenerPolicy: false,
      originAgentCluster: false,
    })
  );

  app.use(rateLimit({ windowMs: 60000, max: 100 }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false,
      forbidNonWhitelisted: false,
      transform: true,
      skipMissingProperties: true,
    })
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  // Setup Swagger documentation
  setupSwagger(app);

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

  // Run seeds automatically on startup
  await runSeeds();

  await app.listen(process.env.PORT || 3000, '0.0.0.0');
  console.log(`server is listening on port ${process.env.PORT || 3000}`);
  console.log(`API → http://localhost:${process.env.PORT || 3000}/docs`);
}
bootstrap();
