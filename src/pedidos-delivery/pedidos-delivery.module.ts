import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PedidosDeliveryService } from './pedidos-delivery.service';
import { PedidosDeliveryController } from './pedidos-delivery.controller';
import { PedidoDelivery } from './entities/pedido-delivery.entity';
import { DetallePedidoDelivery } from './entities/detalle-pedido-delivery.entity';
import { Repartidor } from '../repartidores/entities/repartidor.entity';
import { InventarioModule } from '../inventario/inventario.module';

@Module({
  imports: [TypeOrmModule.forFeature([PedidoDelivery, DetallePedidoDelivery, Repartidor]), InventarioModule],
  controllers: [PedidosDeliveryController],
  providers: [PedidosDeliveryService],
})
export class PedidosDeliveryModule {}
