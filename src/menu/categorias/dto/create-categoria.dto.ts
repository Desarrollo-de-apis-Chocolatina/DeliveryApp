import { IsString, IsNotEmpty, IsOptional, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoriaDto {
  @ApiProperty({
    description: 'Nombre de la categoría del menú.',
    example: 'Bebidas',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/[A-Za-zÁÉÍÓÚáéíóúÑñ]/, {
    message: 'El nombre debe contener al menos una letra.',
  })
  nombre: string;

  @ApiPropertyOptional({
    description: 'Descripción opcional de la categoría.',
    example: 'Bebidas frías y calientes',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  descripcion?: string;
}