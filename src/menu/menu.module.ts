import { Module } from '@nestjs/common';
import { CategoriasModule } from './categorias/categorias.module';
import { PlatillosModule } from './platillos/platillos.module';

@Module({
  imports: [
    CategoriasModule,
    PlatillosModule,
  ],
  exports: [
    CategoriasModule,
    PlatillosModule,
  ],
})
export class MenuModule {}