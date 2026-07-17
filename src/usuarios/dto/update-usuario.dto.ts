import { PartialType } from '@nestjs/swagger';
import { CreateUsuarioDto } from './create-usuario.dto';

/**
 * Hereda todas las validaciones de CreateUsuarioDto pero las hace opcionales.
 * Usar PartialType de @nestjs/swagger (no de @nestjs/mapped-types) para
 * que el plugin de Swagger también lo documente correctamente.
 */
export class UpdateUsuarioDto extends PartialType(CreateUsuarioDto) {}
