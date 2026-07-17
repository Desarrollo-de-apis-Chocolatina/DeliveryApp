import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';

/**
 * Guard global de autorización por roles.
 *
 * Comportamiento:
 * - Sin @Roles() en el handler → cualquier usuario autenticado puede acceder
 * - Con @Roles(Rol.ADMIN) → solo usuarios con ese rol pasan
 * - Si el usuario no tiene el rol → retorna 403 Forbidden
 *
 * Se ejecuta DESPUÉS de JwtAuthGuard (req.user ya está disponible).
 * Registrado como APP_GUARD en AppModule.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Sin roles definidos → endpoint abierto a cualquier autenticado
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    // Verificar que el rol del usuario esté en la lista de roles permitidos
    return requiredRoles.includes(user?.rol);
  }
}
