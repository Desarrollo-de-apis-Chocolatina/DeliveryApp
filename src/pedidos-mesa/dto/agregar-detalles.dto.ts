import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { DetalleDto } from './create-pedido-mesa.dto';

export class AgregarDetallesDto {
  @ApiProperty({ type: [DetalleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetalleDto)
  detalles: DetalleDto[];
}
