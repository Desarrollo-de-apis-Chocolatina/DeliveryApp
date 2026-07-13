import { ValidationPipe } from '@nestjs/common';

/**
 * Configuración global del ValidationPipe.
 *
 * Exportada como constante para usarla en main.ts con app.useGlobalPipes().
 *
 * Opciones:
 * - whitelist: true          → elimina propiedades no declaradas en el DTO (seguridad)
 * - forbidNonWhitelisted: true → lanza error 400 si envían propiedades extra
 * - transform: true           → convierte el payload a instancia del DTO
 * - enableImplicitConversion  → convierte tipos automáticamente (string "5" → number 5)
 */
export const globalValidationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
});
