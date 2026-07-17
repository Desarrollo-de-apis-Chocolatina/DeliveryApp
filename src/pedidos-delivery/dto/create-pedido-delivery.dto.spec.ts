import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreatePedidoDeliveryDto } from './create-pedido-delivery.dto';

describe('CreatePedidoDeliveryDto', () => {
  it('es válido con datos correctos', async () => {
    const dto = plainToInstance(CreatePedidoDeliveryDto, {
      direccion: 'Calle 123',
      detalles: [{ platilloId: 5, cantidad: 2 }],
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rechaza platilloId negativo o cero en un detalle', async () => {
    const dto = plainToInstance(CreatePedidoDeliveryDto, {
      direccion: 'Calle 123',
      detalles: [{ platilloId: -1, cantidad: 1 }],
    });

    const errors = await validate(dto, { validationError: { target: false } });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rechaza cantidad decimal en un detalle', async () => {
    const dto = plainToInstance(CreatePedidoDeliveryDto, {
      direccion: 'Calle 123',
      detalles: [{ platilloId: 5, cantidad: 1.5 }],
    });

    const errors = await validate(dto, { validationError: { target: false } });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rechaza cantidad negativa o cero en un detalle', async () => {
    const dto = plainToInstance(CreatePedidoDeliveryDto, {
      direccion: 'Calle 123',
      detalles: [{ platilloId: 5, cantidad: -2 }],
    });

    const errors = await validate(dto, { validationError: { target: false } });
    expect(errors.length).toBeGreaterThan(0);
  });
});
