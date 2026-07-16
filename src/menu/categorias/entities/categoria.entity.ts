import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OneToMany } from 'typeorm';
import { Platillo } from '../../platillos/entities/platillo.entity';

@Entity('categorias')
export class Categoria {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    unique: true,
    length: 100,
  })
  nombre: string;

  @Column({
    nullable: true,
    length: 255,
  })
  descripcion: string;

  @Column({
    default: true,
  })
  activa: boolean;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;

  @OneToMany(() => Platillo, (platillo) => platillo.categoria)
  platillos: Platillo[];
}
