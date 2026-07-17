import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para registro público de usuarios.
 * No expone el campo 'rol': siempre se asigna 'mesero' por defecto.
 * Solo un admin puede crear usuarios con rol específico (vía UsuariosController).
 */
export class RegisterDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre: string;

  @ApiProperty({ example: 'juan@delivery.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'secret123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: '+503 7777-8888' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  telefono?: string;
}
