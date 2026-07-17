import {
  ArrayMinSize,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

import { IngredienteRecetaDto } from './ingrediente-receta.dto';

export class CreateRecetaDto {
  @ApiProperty({
    description: 'Lista de ingredientes que componen la receta del platillo.',
    type: [IngredienteRecetaDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => IngredienteRecetaDto)
  ingredientes: IngredienteRecetaDto[];
}