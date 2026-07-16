import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy, JwtPayload } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let configService: { getOrThrow: jest.Mock };

  beforeEach(async () => {
    configService = {
      getOrThrow: jest.fn().mockReturnValue('test-secret'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('lee JWT_SECRET desde ConfigService al construirse', () => {
    expect(configService.getOrThrow).toHaveBeenCalledWith('JWT_SECRET');
  });

  it('validate devuelve el payload (sub, email, rol) que se asigna a req.user', async () => {
    const payload: JwtPayload = {
      sub: 'u1',
      email: 'juan@delivery.com',
      rol: 'admin',
    };

    const resultado = await strategy.validate(payload);

    expect(resultado).toEqual({
      sub: 'u1',
      email: 'juan@delivery.com',
      rol: 'admin',
    });
  });
});
