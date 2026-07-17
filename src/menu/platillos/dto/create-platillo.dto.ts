import {IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength, Min} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePlatilloDto {
  @ApiProperty({
    description: 'Nombre del platillo.',
    example: 'Hamburguesa clásica',
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre: string;

  @ApiPropertyOptional({
    description: 'Descripción opcional del platillo.',
    example: 'Carne de res, lechuga, tomate y queso.',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  descripcion?: string;

  @ApiProperty({
    description: 'Precio del platillo (máximo 2 decimales).',
    example: 8.5,
  })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El precio debe tener máximo 2 decimales.' },
  )
  @IsPositive()
  precio: number;

  @ApiPropertyOptional({
    description: 'Indica si el platillo está disponible.',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  disponible?: boolean = true;

  @ApiProperty({
    description: 'ID de la categoría a la que pertenece el platillo.',
    example: 1,
  })
  @IsInt()
  @Min(1)
  categoriaId: number;
}