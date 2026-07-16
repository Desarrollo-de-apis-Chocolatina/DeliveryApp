import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Platillo } from '../../menu/platillos/entities/platillo.entity';

@Entity('recetas')
export class RecetaIngrediente {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Platillo, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'platillo_id',
  })
  platillo: Platillo;

  @Column()
  ingredienteId: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  cantidadPorPorcion: number;

  @Column({
    default: false,
  })
  esIngredienteClave: boolean;
}
