import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

/**
 * Payload que se firma dentro del JWT al hacer login.
 * Disponible en req.user después de que el guard valida el token.
 */
export interface JwtPayload {
  /** UUID del usuario */
  sub: string;
  email: string;
  rol: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      // Extrae el token del header: Authorization: Bearer <token>
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Rechaza tokens expirados (no los ignora)
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * Passport llama este método después de verificar la firma del JWT.
   * Lo que retorne aquí se asigna a req.user.
   * Usamos @CurrentUser() para acceder a esto en los controllers.
   */
  async validate(payload: JwtPayload) {
    return {
      sub: payload.sub,
      email: payload.email,
      rol: payload.rol,
    };
  }
}
