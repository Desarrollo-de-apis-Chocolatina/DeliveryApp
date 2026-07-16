import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePlatilloDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  descripcion?: string;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El precio debe tener máximo 2 decimales.' },
  )
  @IsPositive()
  precio: number;

  @IsOptional()
  @IsBoolean()
  disponible?: boolean = true;

  @IsInt()
  categoriaId: number;
}
