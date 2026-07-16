import { IsString, IsNotEmpty, IsArray, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class DetalleDeliveryDto {
  @ApiProperty()
  @IsNumber()
  platilloId: number;

  @ApiProperty()
  @IsNumber()
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
