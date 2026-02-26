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
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Force HTTP URLs in Swagger
  document.servers = [
    {
      url: `http://192.168.1.185:${process.env.PORT || 3000}`,
      description: 'Local HTTP server',
    },
  ];

  SwaggerModule.setup('docs', app, document);

  console.log('📚 Swagger documentation available at /docs (HTTP enforced)');
}
