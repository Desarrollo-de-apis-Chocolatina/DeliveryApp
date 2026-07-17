import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EstadoPedidoMesa } from '../entities/pedido-mesa.entity';

export class CambiarEstadoMesaDto {
  @ApiProperty({
    enum: EstadoPedidoMesa,
    description: 'Nuevo estado del pedido de mesa.',
    example: EstadoPedidoMesa.EN_COCINA,
  })
  @IsEnum(EstadoPedidoMesa, {
    message: `estado debe ser uno de: ${Object.values(EstadoPedidoMesa).join(', ')}`,
  })
  estado: EstadoPedidoMesa;
}
