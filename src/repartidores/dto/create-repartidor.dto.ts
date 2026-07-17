import { IsString, IsNotEmpty, IsEmail, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRepartidorDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  telefono: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  vehiculo: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  placa: string;
}
