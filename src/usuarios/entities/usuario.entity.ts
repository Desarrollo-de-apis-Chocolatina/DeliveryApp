import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import * as bcrypt from 'bcrypt';

/**
 * Enum de roles del sistema. Exportado para que guards y decoradores
 * de los otros módulos lo puedan importar directamente.
 *
 * Uso: import { Rol } from '../usuarios/entities/usuario.entity';
 */
export enum Rol {
  ADMIN = 'admin',
  MESERO = 'mesero',
  COCINA = 'cocina',
  CAJERO = 'cajero',
  REPARTIDOR = 'repartidor',
}

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 150, unique: true })
  email: string;

  /**
   * select: false → la columna no se incluye en queries por defecto.
   * Se debe usar addSelect('usuario.password') explícitamente cuando se necesite.
   */
  @Column({ length: 255, select: false })
  password: string;

  @Column({ type: 'enum', enum: Rol, default: Rol.MESERO })
  rol: Rol;

  @Column({ default: true })
  activo: boolean;

  /**
   * Campo opcional usado principalmente para repartidores (Persona 4).
   * Evita duplicar el telefono en la tabla repartidores.
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  telefono?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    // Solo hashear si el campo fue modificado (viene como texto plano)
    if (this.password && !this.password.startsWith('$2b$')) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }

  /**
   * Excluye el password de cualquier serialización JSON (respuestas HTTP).
   */
  toJSON() {
    const { password, ...rest } = this as any;
    return rest;
  }
}
