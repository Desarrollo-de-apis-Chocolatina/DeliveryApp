import { IsEnum, IsNumber, IsOptional, IsString, Min, MaxLength } from 'class-validator';
import { UnidadMedida } from '../entities/ingrediente.entity';

/**
 * A propósito NO extiende CreateIngredienteDto: `stock` y `costoUnitario`
 * no deben poder editarse por aquí. Solo cambian vía registrarCompra()
 * o descontarStockDePlatillo(), para no romper el costo promedio ponderado.
 */
export class UpdateIngredienteDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  nombre?: string;

  @IsEnum(UnidadMedida, {
    message: `unidadMedida debe ser uno de: ${Object.values(UnidadMedida).join(', ')}`,
  })
  @IsOptional()
  unidadMedida?: UnidadMedida;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  stockMinimo?: number;
}
