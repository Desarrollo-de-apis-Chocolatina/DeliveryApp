import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Categoria } from '../../categorias/entities/categoria.entity';
import { OneToMany } from 'typeorm';
import { RecetaIngrediente } from '../../../recetas/entities/receta-ingrediente.entity';

@Entity('platillos')
export class Platillo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    unique: true,
    length: 150,
  })
  nombre: string;

  @Column({
    length: 500,
    nullable: true,
  })
  descripcion: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  precio: number;

  @Column({
    default: true,
  })
  disponible: boolean;

  @ManyToOne(() => Categoria, {
    eager: true,
    nullable: false,
  })
  @JoinColumn({
    name: 'categoria_id',
  })
  categoria: Categoria;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;

  @OneToMany(() => RecetaIngrediente, (receta) => receta.platillo)
  receta: RecetaIngrediente[];
}
