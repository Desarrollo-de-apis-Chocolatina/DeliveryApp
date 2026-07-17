import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { PedidoDelivery } from './pedido-delivery.entity';
import { Platillo } from '../../menu/platillos/entities/platillo.entity';

@Entity('detalles_pedido_delivery')
export class DetallePedidoDelivery {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => PedidoDelivery, pedido => pedido.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pedido_id' })
  pedido: PedidoDelivery;

  @ManyToOne(() => Platillo, { eager: true })
  @JoinColumn({ name: 'platillo_id' })
  platillo: Platillo;

  @Column()
  cantidad: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precioUnitario: number;
}
