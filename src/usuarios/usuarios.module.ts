import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from './entities/usuario.entity';
import { UsuariosService } from './usuarios.service';
import { UsuariosController } from './usuarios.controller';

@Module({
  imports: [
    // Registra la entidad Usuario: TypeORM crea la tabla 'usuarios' automáticamente
    TypeOrmModule.forFeature([Usuario]),
  ],
  controllers: [UsuariosController],
  providers: [UsuariosService],
  // Exportar UsuariosService para que AuthModule pueda usarlo en login/register
  exports: [UsuariosService],
})
export class UsuariosModule {}
