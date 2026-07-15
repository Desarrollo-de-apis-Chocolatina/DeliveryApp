import { IsNumber, IsPositive } from 'class-validator';

export class RegistrarCompraDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  cantidad: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  costoUnitario: number;
}
