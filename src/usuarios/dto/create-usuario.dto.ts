import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Rol } from '../entities/usuario.entity';

export class CreateUsuarioDto {
  @ApiProperty({ example: 'María López', description: 'Nombre completo' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre: string;

  @ApiProperty({ example: 'maria@delivery.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'secret123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ enum: Rol, default: Rol.MESERO })
  @IsEnum(Rol)
  @IsOptional()
  rol?: Rol;

  @ApiPropertyOptional({ example: '+503 7777-8888' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  telefono?: string;
}
