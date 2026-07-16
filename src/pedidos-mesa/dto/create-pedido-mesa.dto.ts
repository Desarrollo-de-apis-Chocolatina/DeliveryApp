import { IsNumber, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class DetalleDto {
  @ApiProperty()
  @IsNumber()
  platilloId: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  cantidad: number;
}

export class CreatePedidoMesaDto {
  @ApiProperty()
  @IsNumber()
  numeroMesa: number;

  @ApiProperty({ type: [DetalleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetalleDto)
  detalles: DetalleDto[];
}
