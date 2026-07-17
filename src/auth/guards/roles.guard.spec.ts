import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { Rol } from '../../usuarios/entities/usuario.entity';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  const buildContext = (user: unknown): ExecutionContext =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('permite el acceso cuando no hay @Roles() definido (undefined)', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(buildContext({ rol: Rol.MESERO }))).toBe(true);
  });

  it('permite el acceso cuando la lista de roles está vacía', () => {
    reflector.getAllAndOverride.mockReturnValue([]);

    expect(guard.canActivate(buildContext({ rol: Rol.MESERO }))).toBe(true);
  });

  it('permite el acceso cuando el usuario tiene un rol permitido', () => {
    reflector.getAllAndOverride.mockReturnValue([Rol.ADMIN]);

    expect(guard.canActivate(buildContext({ rol: Rol.ADMIN }))).toBe(true);
  });

  it('deniega el acceso cuando el usuario NO tiene el rol requerido', () => {
    reflector.getAllAndOverride.mockReturnValue([Rol.ADMIN]);

    expect(guard.canActivate(buildContext({ rol: Rol.MESERO }))).toBe(false);
  });

  it('deniega el acceso cuando no hay usuario en la request', () => {
    reflector.getAllAndOverride.mockReturnValue([Rol.ADMIN]);

    expect(guard.canActivate(buildContext(undefined))).toBe(false);
  });
});
