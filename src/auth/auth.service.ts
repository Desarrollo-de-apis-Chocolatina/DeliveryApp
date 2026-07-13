import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from '../usuarios/usuarios.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // create() ya valida email único y hashea el password
    const usuario = await this.usuariosService.create(dto);
    const token = this.generateToken(usuario.id, usuario.email, usuario.rol);
    return { access_token: token };
  }

  async login(dto: LoginDto) {
    const usuario = await this.usuariosService.findByEmail(dto.email);

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValido = await bcrypt.compare(dto.password, usuario.password);
    if (!passwordValido) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const token = this.generateToken(usuario.id, usuario.email, usuario.rol);
    return { access_token: token };
  }

  async getProfile(userId: string) {
    return this.usuariosService.findOne(userId);
  }

  private generateToken(
    userId: string,
    email: string,
    rol: string,
  ): string {
    const payload = { sub: userId, email, rol };
    return this.jwtService.sign(payload);
  }
}
