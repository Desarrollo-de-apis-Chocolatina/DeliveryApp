import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Platillo } from '../menu/platillos/entities/platillo.entity';
import { RecetasModule } from '../recetas/recetas.module';
import { InventarioModule } from '../inventario/inventario.module';
import { RentabilidadService } from './rentabilidad.service';
import { RentabilidadController } from './rentabilidad.controller';

/**
 * Módulo de Rentabilidad (Persona 5). Reporte de solo lectura: lee todos los
 * platillos (disponibles o no) y cruza sus recetas (RecetasService) con el
 * costo unitario promedio de inventario (InventarioService) para calcular el
 * margen por platillo.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Platillo]),
    RecetasModule,
    InventarioModule,
  ],
  controllers: [RentabilidadController],
  providers: [RentabilidadService],
})
export class RentabilidadModule {}
