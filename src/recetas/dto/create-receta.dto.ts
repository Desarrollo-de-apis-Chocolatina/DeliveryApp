import {
  ArrayMinSize,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { IngredienteRecetaDto } from './ingrediente-receta.dto';

export class CreateRecetaDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => IngredienteRecetaDto)
  ingredientes: IngredienteRecetaDto[];
}