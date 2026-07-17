import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Filtro global de excepciones HTTP.
 *
 * Estandariza TODAS las respuestas de error del proyecto con el formato:
 * {
 *   statusCode: number,
 *   message: string | string[],
 *   error: string,
 *   timestamp: string (ISO 8601),
 *   path: string
 * }
 *
 * Esto garantiza que todos los módulos del equipo tengan
 * errores consistentes sin configuración adicional.
 *
 * Registrado globalmente en main.ts con app.useGlobalFilters().
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Extraer mensaje: puede ser string o { message: string[], error: string }
    let message: string | string[];
    let error: string;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
      error = exception.name;
    } else {
      const res = exceptionResponse as Record<string, any>;
      message = res.message ?? exception.message;
      error = res.error ?? exception.name;
    }

    response.status(status).json({
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
