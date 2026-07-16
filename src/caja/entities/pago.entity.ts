import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ValueTransformer,
} from 'typeorm';

/**
 * Tipo de pago con el que se cobra un pedido. Alimenta el desglose del
 * cierre de caja diario.
 */
export enum TipoPago {
  EFECTIVO = 'EFECTIVO',
  TARJETA = 'TARJETA',
  TRANSFERENCIA = 'TRANSFERENCIA',
}

/**
 * Canal del pedido al que corresponde el pago. Como los pedidos de mesa y
 * delivery viven en tablas separadas (Persona 4), el canal indica cuál de
 * las dos referencias (`pedidoMesaId` / `pedidoDeliveryId`) aplica.
 */
export enum CanalPedido {
  MESA = 'MESA',
  DELIVERY = 'DELIVERY',
}

/**
 * TypeORM devuelve las columnas `decimal` como string por defecto.
 * Este transformer las convierte a number en ambas direcciones para que los
 * cálculos del cierre de caja siempre operen con number (mismo patrón que
 * `src/inventario/entities/ingrediente.entity.ts`).
 */
export const decimalTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? value : parseFloat(value),
};

/**
 * Registro de cobro de un pedido. Es la fuente de verdad del módulo de Caja
 * para tipo de pago y propina (datos que las entidades de pedido de Persona 4
 * no almacenan). Cada pago apunta a un pedido de mesa o de delivery.
 */
@Entity('pagos')
export class Pago {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: CanalPedido })
  canal: CanalPedido;

  @Column({ name: 'pedido_mesa_id', type: 'int', nullable: true })
  pedidoMesaId: number | null;

  @Column({ name: 'pedido_delivery_id', type: 'int', nullable: true })
  pedidoDeliveryId: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: decimalTransformer,
  })
  monto: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  propina: number;

  @Column({ type: 'enum', enum: TipoPago })
  tipoPago: TipoPago;

  @Column({ name: 'cajero_id', type: 'int', nullable: true })
  cajeroId: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
