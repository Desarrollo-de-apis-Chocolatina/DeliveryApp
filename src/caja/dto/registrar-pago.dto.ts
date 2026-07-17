import { IsEnum, IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CanalPedido, TipoPago } from '../entities/pago.entity';

export class RegistrarPagoDto {
  @ApiProperty({
    enum: CanalPedido,
    description: 'Canal del pedido a cobrar. Valores posibles: MESA, DELIVERY.',
    example: CanalPedido.MESA,
  })
  @IsEnum(CanalPedido)
  canal: CanalPedido;

  @ApiProperty({
    description: 'ID del pedido (de la tabla del canal indicado) a marcar como pagado.',
    example: 1,
  })
  @IsInt()
  @Min(1)
  pedidoId: number;

  @ApiProperty({
    enum: TipoPago,
    description:
      'Medio de pago con el que se cobró. Valores posibles: EFECTIVO, TARJETA, TRANSFERENCIA.',
    example: TipoPago.TARJETA,
  })
  @IsEnum(TipoPago)
  tipoPago: TipoPago;

  @ApiProperty({
    required: false,
    description: 'Propina recibida (opcional, por defecto 0).',
    example: 2.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  propina?: number;
}
