import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CambiarEstadoDeliveryDto } from './cambiar-estado.dto';
import { EstadoPedidoDelivery } from '../entities/pedido-delivery.entity';

describe('CambiarEstadoDeliveryDto', () => {
  it('es válido con un estado del enum', async () => {
    const dto = plainToInstance(CambiarEstadoDeliveryDto, {
      estado: EstadoPedidoDelivery.EN_CAMINO,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rechaza un estado que no está en el enum', async () => {
    const dto = plainToInstance(CambiarEstadoDeliveryDto, {
      estado: 'EN_PREPARACION',
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'estado')).toBe(true);
  });

  it('rechaza estado vacío', async () => {
    const dto = plainToInstance(CambiarEstadoDeliveryDto, {});

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'estado')).toBe(true);
  });
});
