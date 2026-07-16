import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { DetallePedidoMesa } from './detalle-pedido-mesa.entity';

export enum EstadoPedidoMesa {
  TOMADO = 'TOMADO',
  EN_COCINA = 'EN_COCINA',
  LISTO = 'LISTO',
  ENTREGADO = 'ENTREGADO',
  PAGADO = 'PAGADO',
}

@Entity('pedidos_mesa')
export class PedidoMesa {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  numeroMesa: number;

  @Column({ type: 'enum', enum: EstadoPedidoMesa, default: EstadoPedidoMesa.TOMADO })
  estado: EstadoPedidoMesa;

  @ManyToOne(() => Usuario, { eager: true })
  @JoinColumn({ name: 'mesero_id' })
  mesero: Usuario;

  @OneToMany(() => DetallePedidoMesa, detalle => detalle.pedido, { cascade: true, eager: true })
  detalles: DetallePedidoMesa[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
