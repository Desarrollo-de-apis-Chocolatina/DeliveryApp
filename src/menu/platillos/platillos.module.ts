import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatillosController } from './platillos.controller';
import { PlatillosService } from './platillos.service';
import { Platillo } from './entities/platillo.entity';
import { Categoria } from '../categorias/entities/categoria.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Platillo,
      Categoria,
    ]),
  ],
  controllers: [PlatillosController],
  providers: [PlatillosService],
  exports: [PlatillosService],
})
export class PlatillosModule {}
