# Persona 4: Pedidos y Repartidores Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the orders (mesa and delivery) and drivers modules with their respective state machines and inventory integrations.

**Architecture:** We will create three NestJS modules: `RepartidoresModule`, `PedidosMesaModule`, and `PedidosDeliveryModule`. `Repartidores` will be linked to `Usuario`. Both orders will integrate with `InventarioService` inside a TypeORM transaction during state transitions.

**Tech Stack:** NestJS, TypeORM, class-validator, Jest, Swagger

## Global Constraints

- TypeORM for DB access
- Use `class-validator` for DTO validation
- HTTP exceptions for structured error handling
- Swagger/OpenAPI for documentation
- JWT auth and Role guards from Persona 1 must be used

---
### Task 1: Repartidores Module

**Files:**
- Create: `src/repartidores/entities/repartidor.entity.ts`
- Create: `src/repartidores/dto/create-repartidor.dto.ts`
- Create: `src/repartidores/repartidores.service.ts`
- Create: `src/repartidores/repartidores.controller.ts`
- Create: `src/repartidores/repartidores.module.ts`
- Modify: `src/app.module.ts`

**Interfaces:**
- Consumes: `Usuario` entity, TypeORM `Repository`, `Bcrypt` for hashing passwords.
- Produces: `RepartidoresService.create()`

- [ ] **Step 1: Create Repartidor Entity**

```typescript
import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity('repartidores')
export class Repartidor {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Usuario, { eager: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ length: 50 })
  vehiculo: string;

  @Column({ length: 20 })
  placa: string;

  @Column({ default: true })
  disponible: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

- [ ] **Step 2: Create DTOs**

```typescript
import { IsString, IsNotEmpty, IsEmail, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRepartidorDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  telefono: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  vehiculo: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  placa: string;
}
```

- [ ] **Step 3: Create RepartidoresService**

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Repartidor } from './entities/repartidor.entity';
import { CreateRepartidorDto } from './dto/create-repartidor.dto';
import { Usuario, Rol } from '../usuarios/entities/usuario.entity';

@Injectable()
export class RepartidoresService {
  constructor(
    @InjectRepository(Repartidor)
    private readonly repartidorRepository: Repository<Repartidor>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateRepartidorDto): Promise<Repartidor> {
    return await this.dataSource.transaction(async (manager) => {
      const existingUser = await manager.findOne(Usuario, { where: { email: dto.email } });
      if (existingUser) {
        throw new BadRequestException('El email ya está registrado');
      }

      const usuario = manager.create(Usuario, {
        nombre: dto.nombre,
        email: dto.email,
        password: dto.password,
        rol: Rol.REPARTIDOR,
        telefono: dto.telefono,
      });
      await manager.save(usuario);

      const repartidor = manager.create(Repartidor, {
        usuario,
        vehiculo: dto.vehiculo,
        placa: dto.placa,
      });
      return await manager.save(repartidor);
    });
  }

  async findAll(): Promise<Repartidor[]> {
    return await this.repartidorRepository.find();
  }
}
```

- [ ] **Step 4: Create RepartidoresController**

```typescript
import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { RepartidoresService } from './repartidores.service';
import { CreateRepartidorDto } from './dto/create-repartidor.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../usuarios/entities/usuario.entity';

@ApiTags('repartidores')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('repartidores')
export class RepartidoresController {
  constructor(private readonly repartidoresService: RepartidoresService) {}

  @Post()
  @Roles(Rol.ADMIN)
  create(@Body() createRepartidorDto: CreateRepartidorDto) {
    return this.repartidoresService.create(createRepartidorDto);
  }

  @Get()
  @Roles(Rol.ADMIN)
  findAll() {
    return this.repartidoresService.findAll();
  }
}
```

- [ ] **Step 5: Create RepartidoresModule and update AppModule**

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RepartidoresService } from './repartidores.service';
import { RepartidoresController } from './repartidores.controller';
import { Repartidor } from './entities/repartidor.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Repartidor, Usuario])],
  controllers: [RepartidoresController],
  providers: [RepartidoresService],
  exports: [RepartidoresService],
})
export class RepartidoresModule {}
```

Add `RepartidoresModule` to `imports` in `src/app.module.ts`.

---
### Task 2: Pedidos Mesa Module

**Files:**
- Create: `src/pedidos-mesa/entities/pedido-mesa.entity.ts`
- Create: `src/pedidos-mesa/entities/detalle-pedido-mesa.entity.ts`
- Create: `src/pedidos-mesa/dto/create-pedido-mesa.dto.ts`
- Create: `src/pedidos-mesa/pedidos-mesa.service.ts`
- Create: `src/pedidos-mesa/pedidos-mesa.controller.ts`
- Create: `src/pedidos-mesa/pedidos-mesa.module.ts`

**Interfaces:**
- Consumes: `InventarioService.descontarStockDePlatillo()`

- [ ] **Step 1: Create Entities**

```typescript
// src/pedidos-mesa/entities/pedido-mesa.entity.ts
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
```

```typescript
// src/pedidos-mesa/entities/detalle-pedido-mesa.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { PedidoMesa } from './pedido-mesa.entity';
import { Platillo } from '../../menu/platillos/entities/platillo.entity';

@Entity('detalles_pedido_mesa')
export class DetallePedidoMesa {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => PedidoMesa, pedido => pedido.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pedido_id' })
  pedido: PedidoMesa;

  @ManyToOne(() => Platillo, { eager: true })
  @JoinColumn({ name: 'platillo_id' })
  platillo: Platillo;

  @Column()
  cantidad: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precioUnitario: number;
}
```

- [ ] **Step 2: Create DTOs**

```typescript
// src/pedidos-mesa/dto/create-pedido-mesa.dto.ts
import { IsNumber, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class DetalleDto {
  @ApiProperty()
  @IsNumber()
  platilloId: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  cantidad: number;
}

export class CreatePedidoMesaDto {
  @ApiProperty()
  @IsNumber()
  numeroMesa: number;

  @ApiProperty({ type: [DetalleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetalleDto)
  detalles: DetalleDto[];
}
```

- [ ] **Step 3: Create PedidosMesaService**

```typescript
// src/pedidos-mesa/pedidos-mesa.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PedidoMesa, EstadoPedidoMesa } from './entities/pedido-mesa.entity';
import { DetallePedidoMesa } from './entities/detalle-pedido-mesa.entity';
import { CreatePedidoMesaDto } from './dto/create-pedido-mesa.dto';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Platillo } from '../menu/platillos/entities/platillo.entity';
import { InventarioService } from '../inventario/inventario.service';

@Injectable()
export class PedidosMesaService {
  constructor(
    @InjectRepository(PedidoMesa)
    private readonly pedidoRepository: Repository<PedidoMesa>,
    private readonly dataSource: DataSource,
    private readonly inventarioService: InventarioService,
  ) {}

  async create(dto: CreatePedidoMesaDto, meseroId: string): Promise<PedidoMesa> {
    return await this.dataSource.transaction(async (manager) => {
      const mesero = await manager.findOne(Usuario, { where: { id: meseroId } });
      if (!mesero) throw new NotFoundException('Mesero no encontrado');

      const pedido = manager.create(PedidoMesa, {
        numeroMesa: dto.numeroMesa,
        mesero,
        detalles: [],
      });

      for (const det of dto.detalles) {
        const platillo = await manager.findOne(Platillo, { where: { id: det.platilloId } });
        if (!platillo || !platillo.disponible) {
          throw new BadRequestException(`Platillo ${det.platilloId} no disponible`);
        }
        const detalle = manager.create(DetallePedidoMesa, {
          platillo,
          cantidad: det.cantidad,
          precioUnitario: platillo.precio,
        });
        pedido.detalles.push(detalle);
      }
      return await manager.save(pedido);
    });
  }

  async updateEstado(id: number, estado: EstadoPedidoMesa): Promise<PedidoMesa> {
    if (estado === EstadoPedidoMesa.LISTO) {
      return await this.dataSource.transaction(async (manager) => {
        const pedido = await manager.findOne(PedidoMesa, { where: { id }, relations: ['detalles'] });
        if (!pedido || pedido.estado !== EstadoPedidoMesa.EN_COCINA) {
          throw new BadRequestException('El pedido debe estar EN_COCINA para pasar a LISTO');
        }

        for (const detalle of pedido.detalles) {
          await this.inventarioService.descontarStockDePlatillo(
            detalle.platillo.id,
            detalle.cantidad,
            manager
          );
        }

        pedido.estado = estado;
        return await manager.save(pedido);
      });
    }

    const pedido = await this.pedidoRepository.findOne({ where: { id } });
    if (!pedido) throw new NotFoundException('Pedido no encontrado');
    pedido.estado = estado;
    return await this.pedidoRepository.save(pedido);
  }
}
```

- [ ] **Step 4: Create PedidosMesaController & Module**
Implement Controller exposing POST `/` (requires MESERO role) and PATCH `/:id/estado` (requires COCINA or MESERO role) and add `InventarioModule` to `imports` of `PedidosMesaModule`.

---
### Task 3: Pedidos Delivery Module

**Files:**
- Create: `src/pedidos-delivery/entities/pedido-delivery.entity.ts`
- Create: `src/pedidos-delivery/entities/detalle-pedido-delivery.entity.ts`
- Create: `src/pedidos-delivery/pedidos-delivery.service.ts`

**Interfaces:**
- Consumes: `InventarioService`

- [ ] **Step 1: Create Entities**
Similar to Mesa, but `PedidoDelivery` has `direccion`, `repartidor` (relation to `Repartidor`), and `EstadoPedidoDelivery` (includes `EN_CAMINO`).

- [ ] **Step 2: Assign Driver and Check Limits**
In `PedidosDeliveryService`, implement `updateEstado` and logic to assign `repartidor`:
```typescript
async assignRepartidor(pedidoId: number, repartidorId: number): Promise<PedidoDelivery> {
  const repartidor = await this.repartidorRepository.findOne({ where: { id: repartidorId } });
  if (!repartidor || !repartidor.disponible) throw new BadRequestException('Repartidor no disponible');

  const activeOrders = await this.pedidoDeliveryRepository.count({
    where: { repartidor: { id: repartidorId }, estado: EstadoPedidoDelivery.EN_CAMINO }
  });

  if (activeOrders >= 3) {
    throw new BadRequestException('El repartidor ya tiene 3 pedidos activos en camino');
  }

  const pedido = await this.pedidoDeliveryRepository.findOne({ where: { id: pedidoId } });
  pedido.repartidor = repartidor;
  pedido.estado = EstadoPedidoDelivery.EN_CAMINO;
  return await this.pedidoDeliveryRepository.save(pedido);
}
```

- [ ] **Step 3: Setup Controllers and Module**
Expose POST and PATCH endpoints. Import `InventarioModule` and `RepartidoresModule`. Update `AppModule`.
