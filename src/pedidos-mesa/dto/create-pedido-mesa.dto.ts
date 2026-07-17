import { IsArray, IsInt, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class DetalleDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  platilloId: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  cantidad: number;
}

export class CreatePedidoMesaDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  numeroMesa: number;

  @ApiProperty({ type: [DetalleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetalleDto)
  detalles: DetalleDto[];
}
