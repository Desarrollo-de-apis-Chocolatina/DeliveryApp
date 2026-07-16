/**
 * Script de seed inicial — crea 5 usuarios de prueba (uno por rol).
 *
 * Ejecutar con: npm run seed
 *
 * El script es IDEMPOTENTE: si los usuarios ya existen (mismo email),
 * los omite sin lanzar error.
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Usuario, Rol } from '../../usuarios/entities/usuario.entity';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

// Si DB_HOST es 'db' (configurado para Docker) pero el script corre en Windows (fuera de Docker),
// cambiamos automáticamente el host a 'localhost' para conectarnos al puerto 5432 expuesto por Docker.
const isDocker = fs.existsSync('/.dockerenv');
const host = (!isDocker && process.env.DB_HOST === 'db')
  ? 'localhost'
  : (process.env.DB_HOST ?? 'localhost');

const dataSource = new DataSource({
  type: 'postgres',
  host,
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  entities: [Usuario],
  synchronize: true,
});

const USUARIOS_SEED = [
  {
    nombre: 'Admin Principal',
    email: 'admin@delivery.com',
    password: 'admin123',
    rol: Rol.ADMIN,
    telefono: '+503 2000-0001',
  },
  {
    nombre: 'Mesero Demo',
    email: 'mesero@delivery.com',
    password: 'mesero123',
    rol: Rol.MESERO,
    telefono: '+503 2000-0002',
  },
  {
    nombre: 'Cocina Demo',
    email: 'cocina@delivery.com',
    password: 'cocina123',
    rol: Rol.COCINA,
    telefono: null,
  },
  {
    nombre: 'Cajero Demo',
    email: 'cajero@delivery.com',
    password: 'cajero123',
    rol: Rol.CAJERO,
    telefono: null,
  },
  {
    nombre: 'Repartidor Demo',
    email: 'repartidor@delivery.com',
    password: 'repartidor123',
    rol: Rol.REPARTIDOR,
    telefono: '+503 2000-0005',
  },
];

async function seed() {
  console.log('🌱 Iniciando seed...');

  await dataSource.initialize();
  const repo = dataSource.getRepository(Usuario);

  for (const data of USUARIOS_SEED) {
    const existe = await repo.findOne({ where: { email: data.email } });

    if (existe) {
      console.log(`  ⏩ Omitido (ya existe): ${data.email}`);
      continue;
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const usuario = repo.create({ ...data, password: passwordHash });
    await repo.save(usuario);
    console.log(`  ✅ Creado [${data.rol}]: ${data.email}`);
  }

  await dataSource.destroy();
  console.log('✅ Seed completado.');
}

seed().catch((err) => {
  console.error('❌ Error en seed:', err);
  process.exit(1);
});
