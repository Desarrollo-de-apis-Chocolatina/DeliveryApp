import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pago } from './entities/pago.entity';
import { PedidoMesa } from '../pedidos-mesa/entities/pedido-mesa.entity';
import { PedidoDelivery } from '../pedidos-delivery/entities/pedido-delivery.entity';

/**
 * Módulo de Caja (Persona 5). Registra su propia entidad `Pago` y accede a los
 * pedidos de mesa y delivery (Persona 4) por repositorio para calcular el monto
 * y marcarlos como pagados dentro de una transacción, sin depender de exports
 * de esos módulos. El service y el controller se agregan en las tareas 2 y 3.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Pago, PedidoMesa, PedidoDelivery])],
  controllers: [],
  providers: [],
})
export class CajaModule {}
