import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RegistrarPagoDto } from './registrar-pago.dto';
import { CanalPedido, TipoPago } from '../entities/pago.entity';

describe('RegistrarPagoDto', () => {
  it('es válido con datos correctos', async () => {
    const dto = plainToInstance(RegistrarPagoDto, {
      canal: CanalPedido.MESA,
      pedidoId: 1,
      tipoPago: TipoPago.EFECTIVO,
      propina: 2.5,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('es válido sin propina (opcional)', async () => {
    const dto = plainToInstance(RegistrarPagoDto, {
      canal: CanalPedido.MESA,
      pedidoId: 1,
      tipoPago: TipoPago.EFECTIVO,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rechaza propina negativa', async () => {
    const dto = plainToInstance(RegistrarPagoDto, {
      canal: CanalPedido.MESA,
      pedidoId: 1,
      tipoPago: TipoPago.EFECTIVO,
      propina: -1,
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'propina')).toBe(true);
  });

  it('rechaza pedidoId negativo o cero', async () => {
    const dto = plainToInstance(RegistrarPagoDto, {
      canal: CanalPedido.MESA,
      pedidoId: 0,
      tipoPago: TipoPago.EFECTIVO,
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'pedidoId')).toBe(true);
  });

  it('rechaza un canal fuera del enum', async () => {
    const dto = plainToInstance(RegistrarPagoDto, {
      canal: 'DRIVE_THRU',
      pedidoId: 1,
      tipoPago: TipoPago.EFECTIVO,
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'canal')).toBe(true);
  });
});
