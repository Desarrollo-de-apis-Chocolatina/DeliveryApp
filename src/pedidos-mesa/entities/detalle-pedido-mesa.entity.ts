import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { PedidoMesa } from './pedido-mesa.entity';
import { Platillo } from '../../menu/platillos/entities/platillo.entity';

@Entity('detalles_pedido_mesa')
export class DetallePedidoMesa {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => PedidoMesa, pedido => pedido.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pedido_id' })
  pedido: PedidoMesa;

  @ManyToOne(() => Platillo, { eager: true })
  @JoinColumn({ name: 'platillo_id' })
  platillo: Platillo;

  @Column()
  cantidad: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precioUnitario: number;
}
