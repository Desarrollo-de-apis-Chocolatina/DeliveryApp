import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UnidadMedida } from '../entities/ingrediente.entity';

export class CreateIngredienteDto {
  @ApiProperty({
    description: 'Nombre del ingrediente.',
    example: 'Harina de trigo',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  @ApiProperty({
    description: 'Unidad de medida del ingrediente.',
    enum: UnidadMedida,
    example: UnidadMedida.G,
  })
  @IsEnum(UnidadMedida, {
    message: `unidadMedida debe ser uno de: ${Object.values(UnidadMedida).join(', ')}`,
  })
  unidadMedida: UnidadMedida;

  @ApiPropertyOptional({
    description: 'Stock inicial del ingrediente.',
    example: 1000,
    default: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  stock?: number = 0;

  @ApiProperty({
    description: 'Stock mínimo antes de generar una alerta de reposición.',
    example: 100,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  stockMinimo: number;

  @ApiPropertyOptional({
    description: 'Costo unitario inicial del ingrediente (máximo 4 decimales).',
    example: 0.5,
    default: 0,
  })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @IsOptional()
  costoUnitario?: number = 0;
}
