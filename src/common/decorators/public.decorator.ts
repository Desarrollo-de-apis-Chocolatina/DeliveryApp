import { SetMetadata } from '@nestjs/common';

/**
 * Clave de metadata usada por JwtAuthGuard para detectar endpoints públicos.
 * Exportada para que JwtAuthGuard pueda importarla sin strings mágicos.
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorador @Public() — marca un endpoint como público (sin autenticación JWT).
 *
 * Uso (en endpoints que NO deben requerir token):
 *   @Post('login')
 *   @Public()
 *   login() { ... }
 *
 * Sin este decorador, todos los endpoints requieren JWT (por el guard global).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
