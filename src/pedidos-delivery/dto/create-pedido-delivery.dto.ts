import { IsString, IsNotEmpty, IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class DetalleDeliveryDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  platilloId: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  cantidad: number;
}

export class CreatePedidoDeliveryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  direccion: string;

  @ApiProperty({ type: [DetalleDeliveryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetalleDeliveryDto)
  detalles: DetalleDeliveryDto[];
}
