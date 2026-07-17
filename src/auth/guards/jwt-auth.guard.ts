import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

/**
 * Guard global de autenticación JWT.
 *
 * Comportamiento:
 * - Si el endpoint tiene @Public() → permite acceso sin token
 * - Si no → exige token JWT válido (firma + expiración)
 *
 * Registrado como APP_GUARD en AppModule para aplicarse globalmente.
 * Nadie necesita @UseGuards(JwtAuthGuard) en sus controllers.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}
