import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsPositive,
} from 'class-validator';

export class IngredienteRecetaDto {
  @IsInt({
    message: 'El ID del ingrediente debe ser un número entero.',
  })
  ingredienteId: number;

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

  @IsBoolean({
    message: 'El campo esIngredienteClave debe ser verdadero o falso.',
  })
  esIngredienteClave: boolean;
}