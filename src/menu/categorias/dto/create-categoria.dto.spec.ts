import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateCategoriaDto } from './create-categoria.dto';

describe('CreateCategoriaDto', () => {
  it('es válido con un nombre alfabético', async () => {
    const dto = plainToInstance(CreateCategoriaDto, { nombre: 'Bebidas' });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('es válido con un nombre alfanumérico (contiene al menos una letra)', async () => {
    const dto = plainToInstance(CreateCategoriaDto, { nombre: 'Combo 2x1' });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rechaza un nombre puramente numérico', async () => {
    const dto = plainToInstance(CreateCategoriaDto, { nombre: '12345' });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'nombre')).toBe(true);
  });
});
