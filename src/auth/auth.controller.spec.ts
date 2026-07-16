import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Rol } from '../usuarios/entities/usuario.entity';
import type { JwtPayload } from './strategies/jwt.strategy';

describe('AuthController', () => {
  let controller: AuthController;
  let service: {
    register: jest.Mock;
    login: jest.Mock;
    getProfile: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      register: jest.fn(),
      login: jest.fn(),
      getProfile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: service }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('register delega en AuthService.register', () => {
    const dto = {
      nombre: 'Juan',
      email: 'juan@delivery.com',
      password: 'secret123',
    };

    controller.register(dto);

    expect(service.register).toHaveBeenCalledWith(dto);
  });

  it('login delega en AuthService.login', () => {
    const dto = { email: 'juan@delivery.com', password: 'secret123' };

    controller.login(dto);

    expect(service.login).toHaveBeenCalledWith(dto);
  });

  it('profile delega en AuthService.getProfile con el sub del usuario', () => {
    const user: JwtPayload = {
      sub: 'u1',
      email: 'juan@delivery.com',
      rol: Rol.ADMIN,
    };

    controller.profile(user);

    expect(service.getProfile).toHaveBeenCalledWith('u1');
  });
});
