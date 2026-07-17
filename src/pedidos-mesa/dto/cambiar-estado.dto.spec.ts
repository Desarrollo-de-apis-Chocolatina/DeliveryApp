import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CambiarEstadoMesaDto } from './cambiar-estado.dto';
import { EstadoPedidoMesa } from '../entities/pedido-mesa.entity';

describe('CambiarEstadoMesaDto', () => {
  it('es válido con un estado del enum', async () => {
    const dto = plainToInstance(CambiarEstadoMesaDto, {
      estado: EstadoPedidoMesa.EN_COCINA,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rechaza un estado que no está en el enum', async () => {
    const dto = plainToInstance(CambiarEstadoMesaDto, {
      estado: 'en preparacion',
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'estado')).toBe(true);
  });

  it('rechaza estado vacío', async () => {
    const dto = plainToInstance(CambiarEstadoMesaDto, {});

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'estado')).toBe(true);
  });
});
