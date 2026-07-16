import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecetasController } from './recetas.controller';
import { RecetasService } from './recetas.service';
import { RecetaIngrediente } from './entities/receta-ingrediente.entity';
import { Platillo } from '../menu/platillos/entities/platillo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RecetaIngrediente, Platillo])],
  controllers: [RecetasController],
  providers: [RecetasService],
  exports: [RecetasService],
})
export class RecetasModule {}
