import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication) {
const config = new DocumentBuilder()
  .setTitle('Finora API')
  .setDescription('API documentation for Finora')
  .setVersion('1.0')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'Enter JWT token',
      in: 'header',
    },
    'JWT-auth'
  )
  .addServer('/')
  .build();

  const document = SwaggerModule.createDocument(app, config);

  // Don't set servers - let Swagger use the current URL automatically
  // This way it works with both localhost and 192.168.1.185

  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
    },
    customSiteTitle: 'Finora API Documentation',
  });

  console.log(' Swagger documentation available at /docs');
}
