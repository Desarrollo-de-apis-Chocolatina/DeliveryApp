import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UnidadMedida } from '../entities/ingrediente.entity';

/**
 * A propósito NO extiende CreateIngredienteDto: `stock` y `costoUnitario`
 * no deben poder editarse por aquí. Solo cambian vía registrarCompra()
 * o descontarStockDePlatillo(), para no romper el costo promedio ponderado.
 */
export class UpdateIngredienteDto {
  @ApiPropertyOptional({
    description: 'Nuevo nombre del ingrediente.',
    example: 'Harina de trigo integral',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  nombre?: string;

  @ApiPropertyOptional({
    description: 'Nueva unidad de medida del ingrediente.',
    enum: UnidadMedida,
    example: UnidadMedida.G,
  })
  @IsEnum(UnidadMedida, {
    message: `unidadMedida debe ser uno de: ${Object.values(UnidadMedida).join(', ')}`,
  })
  @IsOptional()
  unidadMedida?: UnidadMedida;

  @ApiPropertyOptional({
    description: 'Nuevo stock mínimo antes de generar una alerta de reposición.',
    example: 150,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  stockMinimo?: number;
}
