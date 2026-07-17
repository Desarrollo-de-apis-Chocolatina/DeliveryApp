import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreatePedidoMesaDto } from './create-pedido-mesa.dto';

describe('CreatePedidoMesaDto', () => {
  it('es válido con datos correctos', async () => {
    const dto = plainToInstance(CreatePedidoMesaDto, {
      numeroMesa: 3,
      detalles: [{ platilloId: 5, cantidad: 2 }],
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rechaza numeroMesa negativo', async () => {
    const dto = plainToInstance(CreatePedidoMesaDto, {
      numeroMesa: -1,
      detalles: [{ platilloId: 5, cantidad: 2 }],
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'numeroMesa')).toBe(true);
  });

  it('rechaza numeroMesa igual a cero', async () => {
    const dto = plainToInstance(CreatePedidoMesaDto, {
      numeroMesa: 0,
      detalles: [{ platilloId: 5, cantidad: 2 }],
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'numeroMesa')).toBe(true);
  });

  it('rechaza numeroMesa decimal', async () => {
    const dto = plainToInstance(CreatePedidoMesaDto, {
      numeroMesa: 2.5,
      detalles: [{ platilloId: 5, cantidad: 1 }],
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'numeroMesa')).toBe(true);
  });

  it('rechaza platilloId negativo o cero en un detalle', async () => {
    const dto = plainToInstance(CreatePedidoMesaDto, {
      numeroMesa: 3,
      detalles: [{ platilloId: 0, cantidad: 1 }],
    });

    const errors = await validate(dto, { validationError: { target: false } });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rechaza cantidad decimal en un detalle', async () => {
    const dto = plainToInstance(CreatePedidoMesaDto, {
      numeroMesa: 3,
      detalles: [{ platilloId: 5, cantidad: 1.5 }],
    });

    const errors = await validate(dto, { validationError: { target: false } });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rechaza cantidad negativa o cero en un detalle', async () => {
    const dto = plainToInstance(CreatePedidoMesaDto, {
      numeroMesa: 3,
      detalles: [{ platilloId: 5, cantidad: 0 }],
    });

    const errors = await validate(dto, { validationError: { target: false } });
    expect(errors.length).toBeGreaterThan(0);
  });
});
