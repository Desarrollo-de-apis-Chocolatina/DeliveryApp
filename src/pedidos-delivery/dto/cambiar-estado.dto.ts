import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EstadoPedidoDelivery } from '../entities/pedido-delivery.entity';

export class CambiarEstadoDeliveryDto {
  @ApiProperty({
    enum: EstadoPedidoDelivery,
    description: 'Nuevo estado del pedido de delivery.',
    example: EstadoPedidoDelivery.EN_CAMINO,
  })
  @IsEnum(EstadoPedidoDelivery, {
    message: `estado debe ser uno de: ${Object.values(EstadoPedidoDelivery).join(', ')}`,
  })
  estado: EstadoPedidoDelivery;
}
