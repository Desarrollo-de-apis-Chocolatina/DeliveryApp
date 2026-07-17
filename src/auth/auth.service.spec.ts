import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { Rol } from '../usuarios/entities/usuario.entity';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usuariosService: {
    create: jest.Mock;
    findByEmail: jest.Mock;
    findOne: jest.Mock;
  };
  let jwtService: { sign: jest.Mock };
  const bcryptCompare = bcrypt.compare as unknown as jest.Mock;

  beforeEach(async () => {
    usuariosService = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findOne: jest.fn(),
    };
    jwtService = { sign: jest.fn().mockReturnValue('signed-token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsuariosService, useValue: usuariosService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    bcryptCompare.mockReset();
  });

  describe('register', () => {
    it('crea el usuario y devuelve un access_token firmado con su payload', async () => {
      usuariosService.create.mockResolvedValue({
        id: 'u1',
        email: 'juan@delivery.com',
        rol: Rol.MESERO,
      });

      const resultado = await service.register({
        nombre: 'Juan',
        email: 'juan@delivery.com',
        password: 'secret123',
      });

      expect(usuariosService.create).toHaveBeenCalled();
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'u1',
        email: 'juan@delivery.com',
        rol: Rol.MESERO,
      });
      expect(resultado).toEqual({ access_token: 'signed-token' });
    });

    it('propaga el error si UsuariosService.create falla (email duplicado)', async () => {
      const error = new Error('conflict');
      usuariosService.create.mockRejectedValue(error);

      await expect(
        service.register({
          nombre: 'Juan',
          email: 'juan@delivery.com',
          password: 'secret123',
        }),
      ).rejects.toThrow(error);
      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('devuelve un access_token cuando las credenciales son válidas', async () => {
      usuariosService.findByEmail.mockResolvedValue({
        id: 'u1',
        email: 'juan@delivery.com',
        rol: Rol.ADMIN,
        password: 'hashed',
        activo: true,
      });
      bcryptCompare.mockResolvedValue(true);

      const resultado = await service.login({
        email: 'juan@delivery.com',
        password: 'secret123',
      });

      expect(bcryptCompare).toHaveBeenCalledWith('secret123', 'hashed');
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'u1',
        email: 'juan@delivery.com',
        rol: Rol.ADMIN,
      });
      expect(resultado).toEqual({ access_token: 'signed-token' });
    });

    it('lanza UnauthorizedException si el usuario no existe', async () => {
      usuariosService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'x@y.com', password: 'secret123' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(bcryptCompare).not.toHaveBeenCalled();
    });

    it('lanza UnauthorizedException si el usuario está inactivo', async () => {
      usuariosService.findByEmail.mockResolvedValue({
        id: 'u1',
        email: 'x@y.com',
        rol: Rol.MESERO,
        password: 'hashed',
        activo: false,
      });

      await expect(
        service.login({ email: 'x@y.com', password: 'secret123' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(bcryptCompare).not.toHaveBeenCalled();
    });

    it('lanza UnauthorizedException si el password es incorrecto', async () => {
      usuariosService.findByEmail.mockResolvedValue({
        id: 'u1',
        email: 'x@y.com',
        rol: Rol.MESERO,
        password: 'hashed',
        activo: true,
      });
      bcryptCompare.mockResolvedValue(false);

      await expect(
        service.login({ email: 'x@y.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('delega en UsuariosService.findOne con el userId', async () => {
      const usuario = { id: 'u1', email: 'x@y.com' };
      usuariosService.findOne.mockResolvedValue(usuario);

      const resultado = await service.getProfile('u1');

      expect(usuariosService.findOne).toHaveBeenCalledWith('u1');
      expect(resultado).toBe(usuario);
    });
  });
});
