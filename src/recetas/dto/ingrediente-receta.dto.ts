import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsPositive,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IngredienteRecetaDto {
  @ApiProperty({
    description: 'ID del ingrediente que forma parte de la receta.',
    example: 1,
  })
  @IsInt({
    message: 'El ID del ingrediente debe ser un número entero.',
  })
  ingredienteId: number;

  @ApiProperty({
    description:
      'Cantidad del ingrediente necesaria por porción (máximo 2 decimales).',
    example: 250,
  })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message: 'La cantidad por porción debe ser un número con máximo 2 decimales.',
    },
  )
  @IsPositive({
    message: 'La cantidad por porción debe ser mayor que cero.',
  })
  cantidadPorPorcion: number;

  @ApiProperty({
    description:
      'Indica si el ingrediente es clave; si falta, el platillo no puede prepararse.',
    example: true,
  })
  @IsBoolean({
    message: 'El campo esIngredienteClave debe ser verdadero o falso.',
  })
  esIngredienteClave: boolean;
}