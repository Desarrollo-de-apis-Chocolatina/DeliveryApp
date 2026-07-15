# Diseño: Módulo de Inventario (Persona 3)

**Fecha:** 2026-07-15
**Autor:** Christian (Persona 3) + asistente IA
**Estado:** Aprobado, pendiente de implementación

## Contexto

El proyecto DeliveryApp es una API NestJS para gestión de restaurante (pedidos en mesa/delivery,
menú, inventario, repartidores, caja, rentabilidad). El equipo está dividido en 5 personas; esta
spec cubre únicamente el alcance de **Persona 3: Inventario**.

### Corrección de contexto importante

El prompt original del usuario indicaba "NestJS + Prisma + PostgreSQL", pero el código real del
repositorio usa **TypeORM** (`@nestjs/typeorm`, `TypeOrmModule.forRootAsync` en
`src/database/database.module.ts`, sin `schema.prisma` ni `@prisma/client`). Persona 1 (auth,
usuarios) y Persona 2 (menú, recetas) ya construyeron sus módulos sobre TypeORM. Se decidió
explícitamente seguir TypeORM para no romper el trabajo ya integrado del equipo.

También se detectó que las entidades ya mergeadas (`Categoria`, `Platillo`, `RecetaIngrediente`)
usan `id` numérico autoincremental (`@PrimaryGeneratedColumn()`), no UUID — solo `Usuario` usa UUID.
El DTO de Persona 2 (`IngredienteRecetaDto.ingredienteId: number`) ya asume que el ID de
`Ingrediente` será numérico. Por consistencia con el código ya mergeado, `Ingrediente` usa `id`
numérico.

## Decisiones de diseño

1. **ORM:** TypeORM (no Prisma). Justificación: evitar romper Auth/Usuarios/Menú/Recetas ya
   implementados por el resto del equipo.
2. **Servicio de descuento acoplado a platillo** (no genérico por ingredientes): se eligió
   `descontarStockDePlatillo(platilloId, cantidad, manager?)`, que resuelve la receta internamente
   vía `RecetasService` y notifica a `PlatillosService.marcarNoDisponiblePorIngrediente` cuando un
   ingrediente llega a 0. Esto sigue el patrón sugerido en `docs/GUIA_PARA_COMPANEROS.md` y
   simplifica la integración para Persona 4 (Pedidos), a costa de que `InventarioModule` dependa de
   `RecetasModule` y `MenuModule`. No hay dependencia circular: ni Recetas ni Menú dependen de
   Inventario.
3. **Unidad de medida:** enum fijo `'kg' | 'g' | 'lt' | 'ml' | 'unidad'`, validado con
   `@IsEnum`.
4. **Registro de compras:** sin tabla de historial (`Lote`/`Compra`). Un endpoint
   `POST /inventario/ingredientes/:id/compra` recalcula `costoUnitarioPromedio` con la fórmula
   ponderada y suma al stock directamente sobre `Ingrediente`.
5. **`stock` y `costoUnitarioPromedio` no son editables vía `PATCH`.** Solo cambian a través de
   `registrarCompra()` (compras) o `descontarStockDePlatillo()` (consumo por pedidos), para proteger
   la invariante del costo promedio ponderado.
6. **Transacciones:** `descontarStockDePlatillo` acepta un `EntityManager` opcional para poder
   participar en la transacción `dataSource.transaction()` que Persona 4 abre al pasar un pedido de
   `EN_COCINA` a `LISTO`. Si no se pasa manager, usa el repositorio inyectado normalmente.
7. **Sin `@UseGuards()` manual en el controller.** Los guards (`JwtAuthGuard`, `RolesGuard`) ya son
   globales vía `APP_GUARD` en `app.module.ts`. Se sigue la guía oficial del equipo en vez de la
   redundancia presente en `PlatillosController`.

## Estructura de carpetas

```
src/inventario/
  dto/
    create-ingrediente.dto.ts
    update-ingrediente.dto.ts
    registrar-compra.dto.ts
  entities/
    ingrediente.entity.ts        (incluye enum UnidadMedida)
  inventario.controller.ts
  inventario.module.ts
  inventario.service.ts
```

(`src/inventario/dto/.gitkeep` y `src/inventario/entities/.gitkeep` ya existen como scaffolding.)

## Modelo TypeORM — `Ingrediente`

| Campo | Tipo | Nota |
|---|---|---|
| `id` | `number` (autoincrement) | Consistente con `Categoria`/`Platillo`/`RecetaIngrediente.ingredienteId` |
| `nombre` | `varchar(100)`, unique | |
| `unidadMedida` | enum `'kg'\|'g'\|'lt'\|'ml'\|'unidad'` | |
| `stock` | `decimal(10,2)` | con `transformer` numérico |
| `stockMinimo` | `decimal(10,2)` | con `transformer` numérico |
| `costoUnitarioPromedio` | `decimal(10,4)` | 4 decimales para no perder precisión al ponderar costos pequeños (ej. costo por gramo); con `transformer` numérico |
| `activo` | `boolean`, default `true` | Soft delete, mismo patrón que `Categoria.activa` / `Platillo.disponible` |
| `createdAt` / `updatedAt` | timestamps | |

Se agrega un `transformer` local (definido en `ingrediente.entity.ts`, no toca código de otras
personas) para que las columnas `decimal` lleguen como `number` en JS en vez del `string` que
TypeORM devuelve por defecto — mismo problema no resuelto que tiene `Platillo.precio`.

## DTOs

- **`CreateIngredienteDto`**: `nombre`, `unidadMedida`, `stockMinimo` requeridos; `stock` y
  `costoUnitario` opcionales (default 0) para el alta inicial.
- **`UpdateIngredienteDto`**: solo `nombre`, `unidadMedida`, `stockMinimo`. Excluye deliberadamente
  `stock` y `costoUnitarioPromedio`.
- **`RegistrarCompraDto`**: `cantidad` (positivo), `costoUnitario` (positivo).

Todos con `class-validator` (`@IsString`, `@IsEnum`, `@IsNumber`, `@IsPositive`, `@Min(0)`, etc.),
siguiendo el patrón ya usado en `recetas/dto/ingrediente-receta.dto.ts`.

## Service — `InventarioService`

```
create(dto)                                                → alta de ingrediente
findAll()                                                    → lista activos
findOne(id)                                                  → 404 si no existe o inactivo
update(id, dto)                                              → solo campos editables
remove(id)                                                   → soft delete (activo = false)
registrarCompra(id, dto)                                     → fórmula ponderada + suma stock
findAlertas()                                                → ingredientes con stock <= stockMinimo
descontarStockDePlatillo(platilloId, cantidad, manager?)     → servicio reutilizable para Pedidos
```

Fórmula de costo promedio ponderado:

```
nuevoCosto = (stockActual * costoActual + cantidadIngresada * costoCompra)
             / (stockActual + cantidadIngresada)
```

`descontarStockDePlatillo`:
1. Resuelve `RecetasService.findByPlatillo(platilloId)`.
2. Por cada `RecetaIngrediente`: `cantidadADescontar = cantidadPorPorcion * cantidadPorciones`.
3. Si `ingrediente.stock < cantidadADescontar` → `BadRequestException` (Pedidos hace rollback de su
   transacción automáticamente).
4. Descuenta y guarda (usando el `manager` si se proporcionó).
5. Si `ingrediente.stock <= 0` tras el descuento → llama
   `PlatillosService.marcarNoDisponiblePorIngrediente(ingrediente.id)`.

## Controller — rutas bajo `inventario/ingredientes`

| Método | Ruta | Roles |
|---|---|---|
| POST | `/inventario/ingredientes` | ADMIN, COCINA |
| GET | `/inventario/ingredientes` | cualquier autenticado |
| GET | `/inventario/ingredientes/alertas` | cualquier autenticado (declarada antes que `:id`) |
| GET | `/inventario/ingredientes/:id` | cualquier autenticado |
| PATCH | `/inventario/ingredientes/:id` | ADMIN, COCINA |
| POST | `/inventario/ingredientes/:id/compra` | ADMIN, COCINA |
| DELETE | `/inventario/ingredientes/:id` | ADMIN, COCINA |

## Módulo

```ts
@Module({
  imports: [TypeOrmModule.forFeature([Ingrediente]), RecetasModule, MenuModule],
  controllers: [InventarioController],
  providers: [InventarioService],
  exports: [InventarioService],
})
export class InventarioModule {}
```

Se registra en `src/app.module.ts`, reemplazando el comentario
`// InventarioModule,   <- Persona 3`.

## Fuera de alcance (deliberado)

- Endpoint de ajuste manual de stock (mermas, conteo físico, correcciones).
- Tabla de historial de compras (`Lote`/`Compra`).
- Notificaciones push/email de alertas — solo consulta vía `GET /inventario/ingredientes/alertas`.

Estos no estaban en el alcance definido por el usuario para Persona 3. Se documentan aquí para que,
si se necesitan más adelante, se agreguen como extensión explícita en vez de asumirse.

## Testing (a cargo de Persona 5 para cobertura global, pero se escriben junto con cada archivo)

- `inventario.service.spec.ts`: casos de alta, actualización, soft delete, cálculo de costo
  ponderado (incluyendo primera compra sobre stock 0), alerta de stock mínimo, descuento exitoso,
  descuento con stock insuficiente (debe lanzar `BadRequestException` y no mutar el stock), y
  descuento que dispara `marcarNoDisponiblePorIngrediente` al llegar a 0.
- `inventario.controller.spec.ts`: verifica que cada ruta delega correctamente al service y que las
  rutas mutantes exigen roles ADMIN/COCINA.
