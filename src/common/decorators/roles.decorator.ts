import { SetMetadata } from '@nestjs/common';
import { Rol } from '../../usuarios/entities/usuario.entity';

/**
 * Clave de metadata usada por RolesGuard para leer los roles requeridos.
 * Exportada para que RolesGuard pueda importarla.
 */
export const ROLES_KEY = 'roles';

/**
 * Decorador @Roles() — restringe un endpoint a uno o más roles.
 *
 * Uso:
 *   @Roles(Rol.ADMIN)
 *   @Roles(Rol.ADMIN, Rol.CAJERO)
 *
 * Se puede aplicar a nivel de clase (controller) o método (handler).
 * Si se aplica a nivel de clase, todos los endpoints del controller
 * requieren esos roles.
 */
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);
