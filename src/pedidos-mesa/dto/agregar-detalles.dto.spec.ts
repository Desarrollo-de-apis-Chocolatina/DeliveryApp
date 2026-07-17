import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AgregarDetallesDto } from './agregar-detalles.dto';

describe('AgregarDetallesDto', () => {
  it('es válido con un arreglo de detalles correctos', async () => {
    const dto = plainToInstance(AgregarDetallesDto, {
      detalles: [{ platilloId: 9, cantidad: 2 }],
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rechaza un detalle con cantidad negativa o cero', async () => {
    const dto = plainToInstance(AgregarDetallesDto, {
      detalles: [{ platilloId: 9, cantidad: 0 }],
    });

    const errors = await validate(dto, { validationError: { target: false } });
    expect(errors.length).toBeGreaterThan(0);
  });
});
