import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PedidosMesaService } from './pedidos-mesa.service';
import { PedidosMesaController } from './pedidos-mesa.controller';
import { PedidoMesa } from './entities/pedido-mesa.entity';
import { DetallePedidoMesa } from './entities/detalle-pedido-mesa.entity';
import { InventarioModule } from '../inventario/inventario.module';
import { PlatillosModule } from '../menu/platillos/platillos.module';

@Module({
  imports: [TypeOrmModule.forFeature([PedidoMesa, DetallePedidoMesa]), InventarioModule, PlatillosModule],
  controllers: [PedidosMesaController],
  providers: [PedidosMesaService],
})
export class PedidosMesaModule {}
