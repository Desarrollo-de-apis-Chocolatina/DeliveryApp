import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  const context = {
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new JwtAuthGuard(reflector as unknown as Reflector);
  });

  it('permite el acceso sin token cuando el endpoint es @Public()', () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('delega en la validación JWT de passport (super.canActivate) cuando NO es público', () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    // super.canActivate vive en el prototipo del mixin AuthGuard('jwt').
    const parentProto = Object.getPrototypeOf(JwtAuthGuard.prototype);
    const superSpy = jest
      .spyOn(parentProto, 'canActivate')
      .mockReturnValue(true);

    const resultado = guard.canActivate(context);

    expect(superSpy).toHaveBeenCalledWith(context);
    expect(resultado).toBe(true);

    superSpy.mockRestore();
  });
});
