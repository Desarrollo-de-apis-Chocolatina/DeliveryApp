import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { globalValidationPipe } from './common/pipes/validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Prefijo global — todas las rutas quedan bajo /api
  app.setGlobalPrefix('api');

  // CORS habilitado para desarrollo (permite peticiones desde Swagger UI y Postman)
  app.enableCors();

  // Validación global de DTOs (whitelist, transform, forbidNonWhitelisted)
  app.useGlobalPipes(globalValidationPipe);

  // Filtro global de excepciones — estandariza todas las respuestas de error
  app.useGlobalFilters(new HttpExceptionFilter());

  // ─── Swagger ────────────────────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('DeliveryApp API')
    .setDescription(
      'API de Gestión de Restaurante con Delivery.\n\n' +
      '**Flujos principales:**\n' +
      '1. Registrar usuario → `POST /api/auth/register`\n' +
      '2. Login → `POST /api/auth/login` → copiar `access_token`\n' +
      '3. Click en **Authorize** → pegar token\n' +
      '4. Explorar endpoints protegidos por rol',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Ingresa el JWT obtenido en /api/auth/login',
      },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // El token persiste entre recargas del browser
    },
  });
  // ────────────────────────────────────────────────────────────────────────────

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 API corriendo en: http://localhost:${port}/api`);
  console.log(`📚 Swagger docs en:  http://localhost:${port}/api/docs`);
}

bootstrap();
