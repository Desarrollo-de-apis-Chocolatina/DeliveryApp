import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Repartidor } from '../../repartidores/entities/repartidor.entity';
import { DetallePedidoDelivery } from './detalle-pedido-delivery.entity';

export enum EstadoPedidoDelivery {
  TOMADO = 'TOMADO',
  EN_COCINA = 'EN_COCINA',
  LISTO = 'LISTO',
  EN_CAMINO = 'EN_CAMINO',
  ENTREGADO = 'ENTREGADO',
  PAGADO = 'PAGADO',
}

@Entity('pedidos_delivery')
export class PedidoDelivery {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  direccion: string;

  @Column({ type: 'enum', enum: EstadoPedidoDelivery, default: EstadoPedidoDelivery.TOMADO })
  estado: EstadoPedidoDelivery;

  @ManyToOne(() => Repartidor, { eager: true, nullable: true })
  @JoinColumn({ name: 'repartidor_id' })
  repartidor: Repartidor | null;

  @OneToMany(() => DetallePedidoDelivery, detalle => detalle.pedido, { cascade: true, eager: true })
  detalles: DetallePedidoDelivery[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
