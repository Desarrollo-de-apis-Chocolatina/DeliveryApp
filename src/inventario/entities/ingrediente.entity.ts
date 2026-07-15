import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ValueTransformer,
} from 'typeorm';

/**
 * Unidades de medida soportadas para el stock de un ingrediente.
 */
export enum UnidadMedida {
  KG = 'kg',
  G = 'g',
  LT = 'lt',
  ML = 'ml',
  UNIDAD = 'unidad',
}

/**
 * TypeORM devuelve las columnas `decimal` como string por defecto.
 * Este transformer las convierte a number en ambas direcciones para
 * que el resto de la app (services, cálculos, respuestas JSON) siempre
 * trabaje con number.
 */
export const decimalTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? value : parseFloat(value),
};

@Entity('ingredientes')
export class Ingrediente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, unique: true })
  nombre: string;

  @Column({ type: 'enum', enum: UnidadMedida })
  unidadMedida: UnidadMedida;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  stock: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: decimalTransformer,
  })
  stockMinimo: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 4,
    default: 0,
    transformer: decimalTransformer,
  })
  costoUnitarioPromedio: number;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
