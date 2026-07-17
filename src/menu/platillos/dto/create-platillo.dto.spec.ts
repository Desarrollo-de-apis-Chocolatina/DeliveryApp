import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreatePlatilloDto } from './create-platillo.dto';

describe('CreatePlatilloDto', () => {
  it('es válido con datos correctos', async () => {
    const dto = plainToInstance(CreatePlatilloDto, {
      nombre: 'Hamburguesa',
      precio: 8.5,
      categoriaId: 1,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rechaza precio negativo', async () => {
    const dto = plainToInstance(CreatePlatilloDto, {
      nombre: 'Hamburguesa',
      precio: -5,
      categoriaId: 1,
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'precio')).toBe(true);
  });

  it('rechaza precio igual a cero', async () => {
    const dto = plainToInstance(CreatePlatilloDto, {
      nombre: 'Hamburguesa',
      precio: 0,
      categoriaId: 1,
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'precio')).toBe(true);
  });

  it('rechaza categoriaId negativo o cero', async () => {
    const dto = plainToInstance(CreatePlatilloDto, {
      nombre: 'Hamburguesa',
      precio: 8.5,
      categoriaId: 0,
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'categoriaId')).toBe(true);
  });
});
