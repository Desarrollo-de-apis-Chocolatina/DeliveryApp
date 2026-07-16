import { IsNumber, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegistrarCompraDto {
  @ApiProperty({
    description: 'Cantidad comprada del ingrediente (máximo 2 decimales).',
    example: 500,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  cantidad: number;

  @ApiProperty({
    description:
      'Costo unitario de la compra (máximo 4 decimales). Usado para recalcular el costo promedio ponderado.',
    example: 0.45,
  })
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  costoUnitario: number;
}
