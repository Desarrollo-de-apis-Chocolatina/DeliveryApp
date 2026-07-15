import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import { UnidadMedida } from '../entities/ingrediente.entity';

export class CreateIngredienteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  @IsEnum(UnidadMedida, {
    message: `unidadMedida debe ser uno de: ${Object.values(UnidadMedida).join(', ')}`,
  })
  unidadMedida: UnidadMedida;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  stock?: number = 0;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  stockMinimo: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @IsOptional()
  costoUnitario?: number = 0;
}
