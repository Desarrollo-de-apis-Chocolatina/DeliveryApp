import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { IngredienteRecetaDto } from './ingrediente-receta.dto';

describe('IngredienteRecetaDto', () => {
  it('es válido con datos correctos', async () => {
    const dto = plainToInstance(IngredienteRecetaDto, {
      ingredienteId: 1,
      cantidadPorPorcion: 0.2,
      esIngredienteClave: true,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rechaza cantidadPorPorcion negativa o cero', async () => {
    const dto = plainToInstance(IngredienteRecetaDto, {
      ingredienteId: 1,
      cantidadPorPorcion: 0,
      esIngredienteClave: true,
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'cantidadPorPorcion')).toBe(true);
  });

  it('rechaza ingredienteId negativo o cero', async () => {
    const dto = plainToInstance(IngredienteRecetaDto, {
      ingredienteId: 0,
      cantidadPorPorcion: 0.2,
      esIngredienteClave: true,
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'ingredienteId')).toBe(true);
  });
});
