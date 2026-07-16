# Módulo de Inventario (Persona 3) — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el módulo `src/inventario/` completo: CRUD de ingredientes, costo promedio ponderado, alertas de stock mínimo y el servicio reutilizable `descontarStockDePlatillo` que consumirá el módulo de Pedidos (Persona 4).

**Architecture:** Módulo NestJS estándar (`entities/`, `dto/`, `*.service.ts`, `*.controller.ts`, `*.module.ts`) sobre TypeORM, siguiendo el mismo patrón que `menu/platillos` y `recetas` ya mergeados por Persona 2. `InventarioModule` importa `RecetasModule` (para resolver la receta de un platillo) y `MenuModule` (para notificar a `PlatillosService` cuando un ingrediente llega a stock 0). Sin dependencias circulares.

**Tech Stack:** NestJS 11, TypeORM, PostgreSQL, class-validator/class-transformer, Jest + @nestjs/testing.

## Global Constraints

- ORM: TypeORM. No usar Prisma en ningún archivo de este módulo.
- Todas las entidades usan `id` numérico autoincremental (`@PrimaryGeneratedColumn()`), no UUID — consistente con `Categoria`, `Platillo`, `RecetaIngrediente.ingredienteId`.
- No agregar `@UseGuards(JwtAuthGuard, RolesGuard)` manual en el controller — los guards ya son globales vía `APP_GUARD` en `src/app.module.ts`. Solo usar `@Roles(...)` donde aplique.
- DTOs de entrada siempre con `class-validator`.
- `stock` y `costoUnitarioPromedio` de `Ingrediente` **no** son editables vía `PATCH` — solo cambian a través de `registrarCompra()` o `descontarStockDePlatillo()`.
- Ruta `GET /inventario/ingredientes/alertas` debe declararse en el controller **antes** que `GET /inventario/ingredientes/:id` (si no, Nest intenta parsear "alertas" como `id`).
- Referencia completa de diseño: `docs/superpowers/specs/2026-07-15-inventario-module-design.md`.

---

## File Structure

- Create: `src/inventario/entities/ingrediente.entity.ts` — entidad `Ingrediente`, enum `UnidadMedida`, `decimalTransformer`.
- Create: `src/inventario/entities/ingrediente.entity.spec.ts` — tests del `decimalTransformer`.
- Create: `src/inventario/dto/create-ingrediente.dto.ts`
- Create: `src/inventario/dto/update-ingrediente.dto.ts`
- Create: `src/inventario/dto/registrar-compra.dto.ts`
- Create: `src/inventario/dto/ingrediente.dto.spec.ts` — tests de validación de los 3 DTOs.
- Create: `src/inventario/inventario.service.ts`
- Create: `src/inventario/inventario.service.spec.ts`
- Create: `src/inventario/inventario.controller.ts`
- Create: `src/inventario/inventario.controller.spec.ts`
- Create: `src/inventario/inventario.module.ts`
- Modify: `src/app.module.ts` — registrar `InventarioModule`.

---

### Task 1: Entidad `Ingrediente` + enum `UnidadMedida` + `decimalTransformer`

**Files:**
- Create: `src/inventario/entities/ingrediente.entity.ts`
- Test: `src/inventario/entities/ingrediente.entity.spec.ts`

**Interfaces:**
- Produces: `export enum UnidadMedida { KG = 'kg', G = 'g', LT = 'lt', ML = 'ml', UNIDAD = 'unidad' }`, `export const decimalTransformer: ValueTransformer`, `export class Ingrediente` con campos `id: number`, `nombre: string`, `unidadMedida: UnidadMedida`, `stock: number`, `stockMinimo: number`, `costoUnitarioPromedio: number`, `activo: boolean`, `createdAt: Date`, `updatedAt: Date`.

- [ ] **Step 1: Write the failing test**

```ts
// src/inventario/entities/ingrediente.entity.spec.ts
import { decimalTransformer } from './ingrediente.entity';

describe('decimalTransformer', () => {
  it('convierte un string decimal de la base de datos a number', () => {
    expect(decimalTransformer.from('12.50')).toBe(12.5);
  });

  it('devuelve null tal cual al leer de la base de datos', () => {
    expect(decimalTransformer.from(null)).toBeNull();
  });

  it('devuelve undefined tal cual al leer de la base de datos', () => {
    expect(decimalTransformer.from(undefined)).toBeUndefined();
  });

  it('pasa el number tal cual al escribir a la base de datos', () => {
    expect(decimalTransformer.to(12.5)).toBe(12.5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ingrediente.entity`
Expected: FAIL — no se puede resolver el módulo `./ingrediente.entity` (el archivo no existe todavía).

- [ ] **Step 3: Write the entity**

```ts
// src/inventario/entities/ingrediente.entity.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- ingrediente.entity`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/inventario/entities/ingrediente.entity.ts src/inventario/entities/ingrediente.entity.spec.ts
git commit -m "feat(inventario): agregar entidad Ingrediente y enum UnidadMedida"
```

---

### Task 2: DTOs — `CreateIngredienteDto`, `UpdateIngredienteDto`, `RegistrarCompraDto`

**Files:**
- Create: `src/inventario/dto/create-ingrediente.dto.ts`
- Create: `src/inventario/dto/update-ingrediente.dto.ts`
- Create: `src/inventario/dto/registrar-compra.dto.ts`
- Test: `src/inventario/dto/ingrediente.dto.spec.ts`

**Interfaces:**
- Consumes: `UnidadMedida` de `../entities/ingrediente.entity` (Task 1).
- Produces: `export class CreateIngredienteDto { nombre: string; unidadMedida: UnidadMedida; stock?: number; stockMinimo: number; costoUnitario?: number; }`, `export class UpdateIngredienteDto { nombre?: string; unidadMedida?: UnidadMedida; stockMinimo?: number; }`, `export class RegistrarCompraDto { cantidad: number; costoUnitario: number; }`.

- [ ] **Step 1: Write the failing test**

```ts
// src/inventario/dto/ingrediente.dto.spec.ts
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateIngredienteDto } from './create-ingrediente.dto';
import { UpdateIngredienteDto } from './update-ingrediente.dto';
import { RegistrarCompraDto } from './registrar-compra.dto';
import { UnidadMedida } from '../entities/ingrediente.entity';

describe('CreateIngredienteDto', () => {
  it('es válido con todos los campos correctos', async () => {
    const dto = plainToInstance(CreateIngredienteDto, {
      nombre: 'Tomate',
      unidadMedida: UnidadMedida.KG,
      stock: 10,
      stockMinimo: 2,
      costoUnitario: 1.5,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('es válido sin stock ni costoUnitario (son opcionales)', async () => {
    const dto = plainToInstance(CreateIngredienteDto, {
      nombre: 'Tomate',
      unidadMedida: UnidadMedida.KG,
      stockMinimo: 2,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rechaza una unidadMedida que no está en el enum', async () => {
    const dto = plainToInstance(CreateIngredienteDto, {
      nombre: 'Tomate',
      unidadMedida: 'kilogramos',
      stockMinimo: 2,
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'unidadMedida')).toBe(true);
  });

  it('rechaza nombre vacío', async () => {
    const dto = plainToInstance(CreateIngredienteDto, {
      nombre: '',
      unidadMedida: UnidadMedida.KG,
      stockMinimo: 2,
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'nombre')).toBe(true);
  });

  it('rechaza stockMinimo negativo', async () => {
    const dto = plainToInstance(CreateIngredienteDto, {
      nombre: 'Tomate',
      unidadMedida: UnidadMedida.KG,
      stockMinimo: -1,
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'stockMinimo')).toBe(true);
  });
});

describe('UpdateIngredienteDto', () => {
  it('es válido sin ningún campo (todos opcionales)', async () => {
    const dto = plainToInstance(UpdateIngredienteDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rechaza stockMinimo negativo si se envía', async () => {
    const dto = plainToInstance(UpdateIngredienteDto, { stockMinimo: -5 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'stockMinimo')).toBe(true);
  });
});

describe('RegistrarCompraDto', () => {
  it('es válido con cantidad y costoUnitario positivos', async () => {
    const dto = plainToInstance(RegistrarCompraDto, {
      cantidad: 5,
      costoUnitario: 2.25,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rechaza cantidad negativa o cero', async () => {
    const dto = plainToInstance(RegistrarCompraDto, {
      cantidad: 0,
      costoUnitario: 2.25,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'cantidad')).toBe(true);
  });

  it('rechaza costoUnitario negativo o cero', async () => {
    const dto = plainToInstance(RegistrarCompraDto, {
      cantidad: 5,
      costoUnitario: 0,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'costoUnitario')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ingrediente.dto`
Expected: FAIL — no se pueden resolver los módulos `./create-ingrediente.dto`, `./update-ingrediente.dto`, `./registrar-compra.dto`.

- [ ] **Step 3: Write the DTOs**

```ts
// src/inventario/dto/create-ingrediente.dto.ts
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import { UnidadMedida } from '../entities/ingrediente.entity';

export class CreateIngredienteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  @IsEnum(UnidadMedida, {
    message: `unidadMedida debe ser uno de: ${Object.values(UnidadMedida).join(', ')}`,
  })
  unidadMedida: UnidadMedida;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  stock?: number = 0;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  stockMinimo: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @IsOptional()
  costoUnitario?: number = 0;
}
```

```ts
// src/inventario/dto/update-ingrediente.dto.ts
import { IsEnum, IsNumber, IsOptional, IsString, Min, MaxLength } from 'class-validator';
import { UnidadMedida } from '../entities/ingrediente.entity';

/**
 * A propósito NO extiende CreateIngredienteDto: `stock` y `costoUnitario`
 * no deben poder editarse por aquí. Solo cambian vía registrarCompra()
 * o descontarStockDePlatillo(), para no romper el costo promedio ponderado.
 */
export class UpdateIngredienteDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  nombre?: string;

  @IsEnum(UnidadMedida, {
    message: `unidadMedida debe ser uno de: ${Object.values(UnidadMedida).join(', ')}`,
  })
  @IsOptional()
  unidadMedida?: UnidadMedida;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  stockMinimo?: number;
}
```

```ts
// src/inventario/dto/registrar-compra.dto.ts
import { IsNumber, IsPositive } from 'class-validator';

export class RegistrarCompraDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  cantidad: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  costoUnitario: number;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- ingrediente.dto`
Expected: PASS — 10 tests.

- [ ] **Step 5: Commit**

```bash
git add src/inventario/dto/
git commit -m "feat(inventario): agregar DTOs de Ingrediente con validaciones"
```

---

### Task 3: `InventarioService` — CRUD básico

**Files:**
- Create: `src/inventario/inventario.service.ts`
- Test: `src/inventario/inventario.service.spec.ts`

**Interfaces:**
- Consumes: `Ingrediente`, `UnidadMedida` (Task 1); `CreateIngredienteDto`, `UpdateIngredienteDto`, `RegistrarCompraDto` (Task 2); `RecetasService.findByPlatillo(platilloId: number): Promise<RecetaIngrediente[]>` de `src/recetas/recetas.service.ts` (`RecetaIngrediente` tiene `ingredienteId: number`, `cantidadPorPorcion: number`); `PlatillosService.marcarNoDisponiblePorIngrediente(ingredienteId: number): Promise<void>` de `src/menu/platillos/platillos.service.ts`.
- Produces: `export class InventarioService` con métodos `create`, `findAll`, `findOne`, `update`, `remove`, `registrarCompra`, `findAlertas`, `descontarStockDePlatillo` — usados por Task 5 (controller) y por Persona 4 (Pedidos) más adelante.

Este task cubre `create`, `findAll`, `findOne`, `update`, `remove`. Los tasks 4 y 5 agregan `registrarCompra`/`findAlertas` y `descontarStockDePlatillo` sobre el mismo archivo.

- [ ] **Step 1: Write the failing tests**

```ts
// src/inventario/inventario.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { InventarioService } from './inventario.service';
import { Ingrediente, UnidadMedida } from './entities/ingrediente.entity';
import { RecetasService } from '../recetas/recetas.service';
import { PlatillosService } from '../menu/platillos/platillos.service';

describe('InventarioService', () => {
  let service: InventarioService;
  let repository: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let recetasService: { findByPlatillo: jest.Mock };
  let platillosService: { marcarNoDisponiblePorIngrediente: jest.Mock };

  beforeEach(async () => {
    repository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn(async (entity) => entity),
    };
    recetasService = { findByPlatillo: jest.fn() };
    platillosService = { marcarNoDisponiblePorIngrediente: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventarioService,
        { provide: getRepositoryToken(Ingrediente), useValue: repository },
        { provide: RecetasService, useValue: recetasService },
        { provide: PlatillosService, useValue: platillosService },
      ],
    }).compile();

    service = module.get<InventarioService>(InventarioService);
  });

  describe('create', () => {
    it('crea un ingrediente con stock y costo en 0 si no se envían', async () => {
      repository.findOne.mockResolvedValue(null);

      const resultado = await service.create({
        nombre: 'Harina',
        unidadMedida: UnidadMedida.KG,
        stockMinimo: 5,
      });

      expect(resultado.stock).toBe(0);
      expect(resultado.costoUnitarioPromedio).toBe(0);
      expect(repository.save).toHaveBeenCalled();
    });

    it('lanza ConflictException si ya existe un ingrediente con ese nombre', async () => {
      repository.findOne.mockResolvedValue({ id: 1, nombre: 'Harina' });

      await expect(
        service.create({
          nombre: 'Harina',
          unidadMedida: UnidadMedida.KG,
          stockMinimo: 5,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('devuelve solo ingredientes activos ordenados por nombre', async () => {
      repository.find.mockResolvedValue([]);

      await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({
        where: { activo: true },
        order: { nombre: 'ASC' },
      });
    });
  });

  describe('findOne', () => {
    it('lanza NotFoundException si el ingrediente no existe', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });

    it('devuelve el ingrediente si existe', async () => {
      repository.findOne.mockResolvedValue({ id: 1, nombre: 'Harina' });

      const resultado = await service.findOne(1);

      expect(resultado).toEqual({ id: 1, nombre: 'Harina' });
    });
  });

  describe('update', () => {
    it('actualiza solo nombre, unidadMedida y stockMinimo', async () => {
      repository.findOne
        .mockResolvedValueOnce({
          id: 1,
          nombre: 'Harina',
          unidadMedida: UnidadMedida.KG,
          stockMinimo: 5,
          stock: 10,
          costoUnitarioPromedio: 2,
        })
        .mockResolvedValueOnce(null);

      const resultado = await service.update(1, { stockMinimo: 8 });

      expect(resultado.stockMinimo).toBe(8);
      expect(resultado.stock).toBe(10);
    });

    it('lanza ConflictException si el nuevo nombre ya existe en otro ingrediente', async () => {
      repository.findOne
        .mockResolvedValueOnce({ id: 1, nombre: 'Harina' })
        .mockResolvedValueOnce({ id: 2, nombre: 'Sal' });

      await expect(service.update(1, { nombre: 'Sal' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('desactiva el ingrediente (soft delete)', async () => {
      repository.findOne.mockResolvedValue({ id: 1, nombre: 'Harina', activo: true });

      const resultado = await service.remove(1);

      expect(resultado.activo).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- inventario.service`
Expected: FAIL — no se puede resolver el módulo `./inventario.service`.

- [ ] **Step 3: Write the minimal implementation**

Solo importar lo que este task usa. `BadRequestException`, `EntityManager` y `RegistrarCompraDto`
NO se importan todavía — los agregan los Tasks 4 y 5 cuando introducen los métodos que
realmente los usan (importarlos antes causa errores de `@typescript-eslint/no-unused-vars`
en `npm run lint`).

```ts
// src/inventario/inventario.service.ts
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ingrediente } from './entities/ingrediente.entity';
import { CreateIngredienteDto } from './dto/create-ingrediente.dto';
import { UpdateIngredienteDto } from './dto/update-ingrediente.dto';
import { RecetasService } from '../recetas/recetas.service';
import { PlatillosService } from '../menu/platillos/platillos.service';

@Injectable()
export class InventarioService {
  constructor(
    @InjectRepository(Ingrediente)
    private readonly ingredienteRepository: Repository<Ingrediente>,
    private readonly recetasService: RecetasService,
    private readonly platillosService: PlatillosService,
  ) {}

  async create(dto: CreateIngredienteDto): Promise<Ingrediente> {
    const existente = await this.ingredienteRepository.findOne({
      where: { nombre: dto.nombre },
    });

    if (existente) {
      throw new ConflictException('Ya existe un ingrediente con ese nombre.');
    }

    const ingrediente = this.ingredienteRepository.create({
      nombre: dto.nombre,
      unidadMedida: dto.unidadMedida,
      stock: dto.stock ?? 0,
      stockMinimo: dto.stockMinimo,
      costoUnitarioPromedio: dto.costoUnitario ?? 0,
    });

    return await this.ingredienteRepository.save(ingrediente);
  }

  async findAll(): Promise<Ingrediente[]> {
    return await this.ingredienteRepository.find({
      where: { activo: true },
      order: { nombre: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Ingrediente> {
    return await this.findIngredienteOrFail(id);
  }

  async update(id: number, dto: UpdateIngredienteDto): Promise<Ingrediente> {
    const ingrediente = await this.findIngredienteOrFail(id);

    if (dto.nombre && dto.nombre !== ingrediente.nombre) {
      const existente = await this.ingredienteRepository.findOne({
        where: { nombre: dto.nombre },
      });

      if (existente) {
        throw new ConflictException('Ya existe un ingrediente con ese nombre.');
      }
    }

    Object.assign(ingrediente, {
      nombre: dto.nombre ?? ingrediente.nombre,
      unidadMedida: dto.unidadMedida ?? ingrediente.unidadMedida,
      stockMinimo: dto.stockMinimo ?? ingrediente.stockMinimo,
    });

    return await this.ingredienteRepository.save(ingrediente);
  }

  async remove(id: number): Promise<Ingrediente> {
    const ingrediente = await this.findIngredienteOrFail(id);

    ingrediente.activo = false;

    return await this.ingredienteRepository.save(ingrediente);
  }

  private async findIngredienteOrFail(id: number): Promise<Ingrediente> {
    const ingrediente = await this.ingredienteRepository.findOne({
      where: { id },
    });

    if (!ingrediente) {
      throw new NotFoundException(`El ingrediente con ID ${id} no existe.`);
    }

    return ingrediente;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- inventario.service`
Expected: PASS — 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/inventario/inventario.service.ts src/inventario/inventario.service.spec.ts
git commit -m "feat(inventario): agregar CRUD basico de InventarioService"
```

---

### Task 4: `InventarioService` — `registrarCompra` y `findAlertas`

**Files:**
- Modify: `src/inventario/inventario.service.ts`
- Modify: `src/inventario/inventario.service.spec.ts`

**Interfaces:**
- Produces (agregado a `InventarioService`): `registrarCompra(id: number, dto: RegistrarCompraDto): Promise<Ingrediente>`, `findAlertas(): Promise<Ingrediente[]>`.

- [ ] **Step 1: Write the failing tests**

Agregar al final de `src/inventario/inventario.service.spec.ts`, antes del cierre del `describe('InventarioService', ...)`:

```ts
  describe('registrarCompra', () => {
    it('recalcula el costo promedio ponderado y suma el stock', async () => {
      repository.findOne.mockResolvedValue({
        id: 1,
        nombre: 'Harina',
        stock: 10,
        costoUnitarioPromedio: 2,
        stockMinimo: 5,
      });

      // (10*2 + 10*4) / 20 = 3
      const resultado = await service.registrarCompra(1, {
        cantidad: 10,
        costoUnitario: 4,
      });

      expect(resultado.costoUnitarioPromedio).toBe(3);
      expect(resultado.stock).toBe(20);
    });

    it('usa el costo de la compra como promedio cuando el stock actual es 0', async () => {
      repository.findOne.mockResolvedValue({
        id: 1,
        nombre: 'Harina',
        stock: 0,
        costoUnitarioPromedio: 0,
        stockMinimo: 5,
      });

      const resultado = await service.registrarCompra(1, {
        cantidad: 5,
        costoUnitario: 3,
      });

      expect(resultado.costoUnitarioPromedio).toBe(3);
      expect(resultado.stock).toBe(5);
    });
  });

  describe('findAlertas', () => {
    it('devuelve solo los ingredientes con stock por debajo o igual al mínimo', async () => {
      repository.find.mockResolvedValue([
        { id: 1, nombre: 'Harina', stock: 2, stockMinimo: 5 },
        { id: 2, nombre: 'Sal', stock: 10, stockMinimo: 5 },
        { id: 3, nombre: 'Azucar', stock: 5, stockMinimo: 5 },
      ]);

      const resultado = await service.findAlertas();

      expect(resultado.map((i) => i.nombre)).toEqual(['Harina', 'Azucar']);
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- inventario.service`
Expected: FAIL — `service.registrarCompra is not a function`, `service.findAlertas is not a function`.

- [ ] **Step 3: Add the methods to `InventarioService`**

Agregar el import de `RegistrarCompraDto` junto a los demás imports de DTOs al inicio del archivo:

```ts
import { RegistrarCompraDto } from './dto/registrar-compra.dto';
```

Agregar estos dos métodos dentro de la clase `InventarioService` (después de `remove`, antes de `findIngredienteOrFail`):

```ts
  async registrarCompra(id: number, dto: RegistrarCompraDto): Promise<Ingrediente> {
    const ingrediente = await this.findIngredienteOrFail(id);

    const stockActual = ingrediente.stock;
    const costoActual = ingrediente.costoUnitarioPromedio;
    const stockNuevo = stockActual + dto.cantidad;

    ingrediente.costoUnitarioPromedio =
      (stockActual * costoActual + dto.cantidad * dto.costoUnitario) / stockNuevo;
    ingrediente.stock = stockNuevo;

    return await this.ingredienteRepository.save(ingrediente);
  }

  async findAlertas(): Promise<Ingrediente[]> {
    const ingredientes = await this.ingredienteRepository.find({
      where: { activo: true },
      order: { nombre: 'ASC' },
    });

    return ingredientes.filter((i) => i.stock <= i.stockMinimo);
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- inventario.service`
Expected: PASS — 11 tests.

- [ ] **Step 5: Commit**

```bash
git add src/inventario/inventario.service.ts src/inventario/inventario.service.spec.ts
git commit -m "feat(inventario): agregar registrarCompra y findAlertas"
```

---

### Task 5: `InventarioService` — `descontarStockDePlatillo` (servicio reutilizable para Pedidos)

**Files:**
- Modify: `src/inventario/inventario.service.ts`
- Modify: `src/inventario/inventario.service.spec.ts`

**Interfaces:**
- Produces (agregado a `InventarioService`): `descontarStockDePlatillo(platilloId: number, cantidadPorciones: number, manager?: EntityManager): Promise<void>` — este es el método que Persona 4 (Pedidos) inyectará y llamará dentro de su propia transacción `dataSource.transaction(async manager => ...)`.

- [ ] **Step 1: Write the failing tests**

Agregar al final de `src/inventario/inventario.service.spec.ts`, antes del cierre del `describe('InventarioService', ...)`:

```ts
  describe('descontarStockDePlatillo', () => {
    it('descuenta el stock de cada ingrediente de la receta', async () => {
      recetasService.findByPlatillo.mockResolvedValue([
        { ingredienteId: 1, cantidadPorPorcion: 0.2 },
      ]);
      repository.findOne.mockResolvedValue({
        id: 1,
        nombre: 'Carne',
        stock: 5,
        stockMinimo: 1,
      });

      await service.descontarStockDePlatillo(10, 3);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, stock: 5 - 0.2 * 3 }),
      );
    });

    it('lanza BadRequestException si algún ingrediente no tiene stock suficiente y no guarda nada', async () => {
      recetasService.findByPlatillo.mockResolvedValue([
        { ingredienteId: 1, cantidadPorPorcion: 10 },
      ]);
      repository.findOne.mockResolvedValue({
        id: 1,
        nombre: 'Carne',
        stock: 5,
        stockMinimo: 1,
      });

      await expect(service.descontarStockDePlatillo(10, 3)).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('no descuenta ningún ingrediente si uno de la lista falla (todo o nada)', async () => {
      recetasService.findByPlatillo.mockResolvedValue([
        { ingredienteId: 1, cantidadPorPorcion: 1 },
        { ingredienteId: 2, cantidadPorPorcion: 100 },
      ]);
      repository.findOne
        .mockResolvedValueOnce({ id: 1, nombre: 'Carne', stock: 5, stockMinimo: 1 })
        .mockResolvedValueOnce({ id: 2, nombre: 'Sal', stock: 1, stockMinimo: 1 });

      await expect(service.descontarStockDePlatillo(10, 1)).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('marca el platillo no disponible cuando un ingrediente llega a stock 0', async () => {
      recetasService.findByPlatillo.mockResolvedValue([
        { ingredienteId: 1, cantidadPorPorcion: 5 },
      ]);
      repository.findOne.mockResolvedValue({
        id: 1,
        nombre: 'Carne',
        stock: 5,
        stockMinimo: 1,
      });

      await service.descontarStockDePlatillo(10, 1);

      expect(platillosService.marcarNoDisponiblePorIngrediente).toHaveBeenCalledWith(1);
    });

    it('no marca el platillo no disponible si el stock queda por encima de 0', async () => {
      recetasService.findByPlatillo.mockResolvedValue([
        { ingredienteId: 1, cantidadPorPorcion: 1 },
      ]);
      repository.findOne.mockResolvedValue({
        id: 1,
        nombre: 'Carne',
        stock: 5,
        stockMinimo: 1,
      });

      await service.descontarStockDePlatillo(10, 1);

      expect(platillosService.marcarNoDisponiblePorIngrediente).not.toHaveBeenCalled();
    });
  });
```

También agregar el import de `BadRequestException` al inicio del spec:

```ts
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
```

(reemplaza la línea `import { ConflictException, NotFoundException } from '@nestjs/common';` del Task 3).

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- inventario.service`
Expected: FAIL — `service.descontarStockDePlatillo is not a function`.

- [ ] **Step 3: Add the method to `InventarioService`**

Actualizar el import de `@nestjs/common` para incluir `BadRequestException`, y el de `typeorm` para incluir `EntityManager`:

```ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
```

```ts
import { EntityManager, Repository } from 'typeorm';
```

Agregar este método dentro de la clase `InventarioService` (después de `findAlertas`, antes de `findIngredienteOrFail`):

```ts
  async descontarStockDePlatillo(
    platilloId: number,
    cantidadPorciones: number,
    manager?: EntityManager,
  ): Promise<void> {
    const ingredienteRepo = manager
      ? manager.getRepository(Ingrediente)
      : this.ingredienteRepository;

    const recetaIngredientes = await this.recetasService.findByPlatillo(platilloId);

    // Primera pasada: validar que TODOS los ingredientes tengan stock
    // suficiente antes de mutar cualquiera (todo o nada, incluso sin
    // transacción externa).
    const descuentos: { ingrediente: Ingrediente; cantidadADescontar: number }[] = [];

    for (const recetaIngrediente of recetaIngredientes) {
      const cantidadADescontar =
        recetaIngrediente.cantidadPorPorcion * cantidadPorciones;

      const ingrediente = await ingredienteRepo.findOne({
        where: { id: recetaIngrediente.ingredienteId },
      });

      if (!ingrediente) {
        throw new NotFoundException(
          `El ingrediente con ID ${recetaIngrediente.ingredienteId} no existe.`,
        );
      }

      if (ingrediente.stock < cantidadADescontar) {
        throw new BadRequestException(
          `Stock insuficiente del ingrediente: ${ingrediente.nombre}`,
        );
      }

      descuentos.push({ ingrediente, cantidadADescontar });
    }

    // Segunda pasada: aplicar los descuentos ya validados.
    for (const { ingrediente, cantidadADescontar } of descuentos) {
      ingrediente.stock -= cantidadADescontar;

      await ingredienteRepo.save(ingrediente);

      if (ingrediente.stock <= 0) {
        await this.platillosService.marcarNoDisponiblePorIngrediente(ingrediente.id);
      }
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- inventario.service`
Expected: PASS — 16 tests.

- [ ] **Step 5: Commit**

```bash
git add src/inventario/inventario.service.ts src/inventario/inventario.service.spec.ts
git commit -m "feat(inventario): agregar descontarStockDePlatillo reutilizable para Pedidos"
```

---

### Task 6: `InventarioController`

**Files:**
- Create: `src/inventario/inventario.controller.ts`
- Test: `src/inventario/inventario.controller.spec.ts`

**Interfaces:**
- Consumes: `InventarioService` (Tasks 3-5) con todos sus métodos públicos.
- Produces: `export class InventarioController` en la ruta base `inventario/ingredientes` — usado por Task 7 (module).

- [ ] **Step 1: Write the failing tests**

```ts
// src/inventario/inventario.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { InventarioController } from './inventario.controller';
import { InventarioService } from './inventario.service';
import { UnidadMedida } from './entities/ingrediente.entity';

describe('InventarioController', () => {
  let controller: InventarioController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findAlertas: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    registrarCompra: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findAlertas: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      registrarCompra: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventarioController],
      providers: [{ provide: InventarioService, useValue: service }],
    }).compile();

    controller = module.get<InventarioController>(InventarioController);
  });

  it('create delega en InventarioService.create', () => {
    const dto = { nombre: 'Harina', unidadMedida: UnidadMedida.KG, stockMinimo: 5 };

    controller.create(dto as any);

    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('findAll delega en InventarioService.findAll', () => {
    controller.findAll();

    expect(service.findAll).toHaveBeenCalled();
  });

  it('findAlertas delega en InventarioService.findAlertas', () => {
    controller.findAlertas();

    expect(service.findAlertas).toHaveBeenCalled();
  });

  it('findOne delega en InventarioService.findOne con el id parseado', () => {
    controller.findOne(7);

    expect(service.findOne).toHaveBeenCalledWith(7);
  });

  it('update delega en InventarioService.update', () => {
    const dto = { stockMinimo: 3 };

    controller.update(7, dto as any);

    expect(service.update).toHaveBeenCalledWith(7, dto);
  });

  it('registrarCompra delega en InventarioService.registrarCompra', () => {
    const dto = { cantidad: 5, costoUnitario: 2 };

    controller.registrarCompra(7, dto as any);

    expect(service.registrarCompra).toHaveBeenCalledWith(7, dto);
  });

  it('remove delega en InventarioService.remove', () => {
    controller.remove(7);

    expect(service.remove).toHaveBeenCalledWith(7);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- inventario.controller`
Expected: FAIL — no se puede resolver el módulo `./inventario.controller`.

- [ ] **Step 3: Write the controller**

```ts
// src/inventario/inventario.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../usuarios/entities/usuario.entity';
import { InventarioService } from './inventario.service';
import { CreateIngredienteDto } from './dto/create-ingrediente.dto';
import { UpdateIngredienteDto } from './dto/update-ingrediente.dto';
import { RegistrarCompraDto } from './dto/registrar-compra.dto';

@ApiTags('Inventario')
@ApiBearerAuth()
@Controller('inventario/ingredientes')
export class InventarioController {
  constructor(private readonly inventarioService: InventarioService) {}

  @ApiOperation({ summary: 'Crear un ingrediente' })
  @ApiResponse({ status: 201, description: 'Ingrediente creado correctamente.' })
  @Roles(Rol.ADMIN, Rol.COCINA)
  @Post()
  create(@Body() createIngredienteDto: CreateIngredienteDto) {
    return this.inventarioService.create(createIngredienteDto);
  }

  @ApiOperation({ summary: 'Listar ingredientes' })
  @ApiResponse({ status: 200, description: 'Lista de ingredientes.' })
  @Get()
  findAll() {
    return this.inventarioService.findAll();
  }

  @ApiOperation({ summary: 'Listar ingredientes con stock por debajo del mínimo' })
  @ApiResponse({ status: 200, description: 'Lista de ingredientes en alerta.' })
  @Get('alertas')
  findAlertas() {
    return this.inventarioService.findAlertas();
  }

  @ApiOperation({ summary: 'Obtener un ingrediente por ID' })
  @ApiResponse({ status: 200, description: 'Ingrediente encontrado.' })
  @ApiResponse({ status: 404, description: 'Ingrediente no encontrado.' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.inventarioService.findOne(id);
  }

  @ApiOperation({ summary: 'Actualizar un ingrediente' })
  @ApiResponse({ status: 200, description: 'Ingrediente actualizado.' })
  @Roles(Rol.ADMIN, Rol.COCINA)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateIngredienteDto: UpdateIngredienteDto,
  ) {
    return this.inventarioService.update(id, updateIngredienteDto);
  }

  @ApiOperation({ summary: 'Registrar una compra y recalcular el costo promedio ponderado' })
  @ApiResponse({ status: 200, description: 'Compra registrada, stock y costo actualizados.' })
  @Roles(Rol.ADMIN, Rol.COCINA)
  @Post(':id/compra')
  registrarCompra(
    @Param('id', ParseIntPipe) id: number,
    @Body() registrarCompraDto: RegistrarCompraDto,
  ) {
    return this.inventarioService.registrarCompra(id, registrarCompraDto);
  }

  @ApiOperation({ summary: 'Desactivar un ingrediente' })
  @ApiResponse({ status: 200, description: 'Ingrediente desactivado.' })
  @Roles(Rol.ADMIN, Rol.COCINA)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.inventarioService.remove(id);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- inventario.controller`
Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/inventario/inventario.controller.ts src/inventario/inventario.controller.spec.ts
git commit -m "feat(inventario): agregar InventarioController"
```

---

### Task 7: `InventarioModule` + registro en `AppModule`

**Files:**
- Create: `src/inventario/inventario.module.ts`
- Modify: `src/app.module.ts`

**Interfaces:**
- Consumes: `Ingrediente` (Task 1), `InventarioController` (Task 6), `InventarioService` (Tasks 3-5), `RecetasModule` de `src/recetas/recetas.module.ts` (exporta `RecetasService`), `MenuModule` de `src/menu/menu.module.ts` (re-exporta `PlatillosModule`, que exporta `PlatillosService`).
- Produces: `export class InventarioModule` — se registra en `AppModule.imports`.

- [ ] **Step 1: Write the module**

```ts
// src/inventario/inventario.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventarioController } from './inventario.controller';
import { InventarioService } from './inventario.service';
import { Ingrediente } from './entities/ingrediente.entity';
import { RecetasModule } from '../recetas/recetas.module';
import { MenuModule } from '../menu/menu.module';

@Module({
  imports: [TypeOrmModule.forFeature([Ingrediente]), RecetasModule, MenuModule],
  controllers: [InventarioController],
  providers: [InventarioService],
  exports: [InventarioService],
})
export class InventarioModule {}
```

- [ ] **Step 2: Register `InventarioModule` in `AppModule`**

En `src/app.module.ts`, agregar el import junto a los demás módulos de negocio:

```ts
import { InventarioModule } from './inventario/inventario.module';
```

Y reemplazar el comentario `// InventarioModule,   <- Persona 3` dentro del array `imports` por:

```ts
    InventarioModule,
```

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: PASS — todos los tests del proyecto, incluyendo los 4 archivos nuevos de `src/inventario/`.

- [ ] **Step 4: Verify the project still compiles**

Run: `npm run build`
Expected: exit code 0, sin errores de TypeScript (esto confirma que `InventarioModule` resuelve correctamente sus dependencias de `RecetasModule` y `MenuModule`, y que no hay un ciclo de imports).

- [ ] **Step 5: Commit**

```bash
git add src/inventario/inventario.module.ts src/app.module.ts
git commit -m "feat(inventario): registrar InventarioModule en AppModule"
```

---

## Verificación manual (fuera de los tasks, opcional pero recomendada)

Una vez completado el Task 7, para ver el módulo funcionando end-to-end:

1. `docker compose up --build` (o `npm run start:dev` si ya tienes Postgres accesible localmente vía `.env`).
2. `npm run seed` si aún no lo has corrido, para tener el usuario `admin@delivery.com` / `admin123`.
3. Abrir `http://localhost:3000/api/docs`, hacer login, autorizar con el token, y probar en orden:
   - `POST /api/inventario/ingredientes` → crear un ingrediente (ej. `{"nombre":"Carne","unidadMedida":"kg","stockMinimo":1,"stock":5,"costoUnitario":4}`).
   - `GET /api/inventario/ingredientes` → verificar que aparece.
   - `POST /api/inventario/ingredientes/:id/compra` → verificar que `costoUnitarioPromedio` se recalcula.
   - `GET /api/inventario/ingredientes/alertas` → bajar el stock por debajo del mínimo (vía otra compra o esperando a que Persona 4 integre el descuento) y confirmar que aparece aquí.

Esto no reemplaza los tests automatizados de cada task, es solo la confirmación visual de que el módulo responde en Swagger antes de avisarle al equipo que `InventarioService` ya está listo para que Persona 4 lo inyecte.
