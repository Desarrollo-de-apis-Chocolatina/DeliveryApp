import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../../auth/strategies/jwt.strategy';

/**
 * Decorador @CurrentUser() — extrae req.user del contexto HTTP.
 *
 * req.user es poblado por JwtStrategy.validate() después de
 * verificar el token JWT.
 *
 * Uso:
 *   @Get('profile')
 *   getProfile(@CurrentUser() user: JwtPayload) {
 *     console.log(user.sub);   // UUID del usuario
 *     console.log(user.email); // email
 *     console.log(user.rol);   // 'admin' | 'mesero' | etc.
 *   }
 *
 * También se puede extraer solo un campo:
 *   @CurrentUser('rol') rol: string
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload;
    return data ? user?.[data] : user;
  },
);
