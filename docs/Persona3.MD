# Guía de Integración – De Persona 3 (Inventario) para Persona 4 (Pedidos)

## Objetivo

Este documento explica cómo integrar el módulo de **Pedidos** (Mesa y Delivery) con el módulo de **Inventario**, ya completado y mergeado a `Chris`.

El objetivo es mantener una arquitectura desacoplada: Pedidos **no debe acceder directamente a la entidad o al repositorio de `Ingrediente`**, sino usar el único servicio público expuesto para eso.

---

# ¿Qué implementó Persona 3?

```text
src/inventario/
├── entities/
│   └── ingrediente.entity.ts
├── dto/
│   ├── create-ingrediente.dto.ts
│   ├── update-ingrediente.dto.ts
│   └── registrar-compra.dto.ts
├── inventario.service.ts
├── inventario.controller.ts
└── inventario.module.ts
```

## Funcionalidades implementadas

* CRUD completo de Ingredientes (con soft delete vía `activo`).
* Control de stock y stock mínimo.
* Costo por unidad y costo promedio ponderado, recalculado al registrar cada compra.
* Alerta de stock bajo mínimo (`GET /inventario/ingredientes/alertas`).
* Servicio reutilizable de descuento de stock por platillo, pensado para ser invocado por Pedidos.
* Protección mediante JWT + Roles (ADMIN, COCINA en las mutaciones).
* Documentación Swagger.
* `InventarioService` exportado desde `InventarioModule` para integración con otros módulos.

No es necesario modificar el módulo de Inventario para implementar Pedidos.

---

# Entidad `Ingrediente`

```ts
{
  id: number;                    // autoincremental, igual que Categoria/Platillo
  nombre: string;                 // único
  unidadMedida: 'kg' | 'g' | 'lt' | 'ml' | 'unidad';
  stock: number;                  // decimal(10,2)
  stockMinimo: number;            // decimal(10,2)
  costoUnitarioPromedio: number;  // decimal(10,4)
  activo: boolean;                // soft delete
  createdAt: Date;
  updatedAt: Date;
}
```

`stock` y `costoUnitarioPromedio` **no son editables vía `PATCH`** — solo cambian a través de `registrarCompra()` (compras) o `descontarStockDePlatillo()` (consumo por pedidos). Esto protege la integridad del costo promedio ponderado.

---

# Decisiones de negocio importantes

## Ingredientes clave (heredado de Persona 2)

`RecetaIngrediente.esIngredienteClave` (definido por Persona 2) determina si un ingrediente afecta la disponibilidad del platillo. Inventario respeta esta regla al pie de la letra:

* Si `esIngredienteClave = true` y el stock llega a **0** → Inventario invoca automáticamente `PlatillosService.marcarNoDisponiblePorIngrediente(ingredienteId)`.
* Si `esIngredienteClave = false` → el stock se descuenta igual, pero **no** se marca el platillo como no disponible.

Pedidos no necesita preocuparse por esta lógica: ocurre automáticamente dentro de `descontarStockDePlatillo()`.

## Costo promedio ponderado

Cada vez que se registra una compra, el costo se recalcula (nunca se reemplaza):

```text
nuevoCosto = (stockActual × costoActual + cantidadIngresada × costoCompra)
             / (stockActual + cantidadIngresada)
```

---

# Servicio público disponible

## `InventarioService`

Exportado desde:

```ts
InventarioModule
```

### Método relevante para Pedidos

```ts
descontarStockDePlatillo(
  platilloId: number,
  cantidadPorciones: number,
  manager?: EntityManager,
): Promise<void>
```

### ¿Qué hace?

1. Obtiene la receta del platillo vía `RecetasService.findByPlatillo(platilloId)` (internamente Inventario ya resuelve la receta — Pedidos **no** necesita llamar a `RecetasService` para esto).
2. **Primera pasada (validación):** por cada ingrediente de la receta calcula `cantidadPorPorcion × cantidadPorciones` y verifica que haya stock suficiente. Si algún ingrediente no alcanza, lanza `BadRequestException` **antes de modificar nada**.
3. **Segunda pasada (aplicación):** solo si todos los ingredientes pasaron la validación, descuenta el stock de cada uno y lo guarda.
4. Si un ingrediente **clave** llega a stock ≤ 0, invoca `PlatillosService.marcarNoDisponiblePorIngrediente()` automáticamente.

Este método:

* ✔ Valida stock suficiente antes de descontar (todo o nada).
* ✔ Descuenta el inventario.
* ✔ Marca platillos no disponibles cuando corresponde (ingredientes clave).
* ✔ Puede participar en la transacción de Pedidos si se le pasa un `manager`.

Este método **NO**:

* se ejecuta automáticamente en ningún punto del ciclo de vida del pedido — **Pedidos decide cuándo llamarlo**.
* revierte la notificación a `PlatillosService` si la transacción de Pedidos hace rollback después de que este método ya retornó (ver "Limitaciones conocidas" abajo).

### Contrato transaccional (importante)

Según la Regla 2 del proyecto, el descuento de inventario **solo debe ocurrir en la transición `En Cocina → Listo`**, dentro de una transacción de base de datos. `descontarStockDePlatillo` está diseñado exactamente para eso:

```ts
// En PedidosMesaService / PedidosDeliveryService

constructor(
  private readonly dataSource: DataSource,
  private readonly inventarioService: InventarioService, // inyectado de InventarioModule
) {}

async cambiarEstadoAListo(pedidoId: string) {
  return await this.dataSource.transaction(async (manager) => {
    const pedido = await manager.findOne(PedidoMesa, {
      where: { id: pedidoId },
      relations: ['detalles'],
    });

    if (!pedido || pedido.estado !== EstadoPedidoMesa.EN_COCINA) {
      throw new BadRequestException('El pedido debe estar en EN_COCINA para pasar a LISTO');
    }

    for (const detalle of pedido.detalles) {
      await this.inventarioService.descontarStockDePlatillo(
        detalle.platilloId,
        detalle.cantidad,
        manager, // <-- OBLIGATORIO pasar el manager para que el lock y el rollback funcionen
      );
    }

    pedido.estado = EstadoPedidoMesa.LISTO;
    return await manager.save(PedidoMesa, pedido);
  });
}
```

Si `descontarStockDePlatillo` lanza `BadRequestException` (stock insuficiente), la transacción completa hace rollback automáticamente: el pedido permanece en `EN_COCINA` y el inventario no se toca.

**Siempre pasa el `manager`.** Sin él, `descontarStockDePlatillo` funciona igual pero pierde dos garantías: no adquiere lock pesimista sobre la fila del ingrediente (riesgo de sobreventa en pedidos concurrentes) y, si falla a mitad de una receta con varios ingredientes, los ya guardados no se revierten.

---

# Otros métodos de `InventarioService` (no usados directamente por Pedidos, pero disponibles)

```ts
create(dto: CreateIngredienteDto): Promise<Ingrediente>
findAll(): Promise<Ingrediente[]>
findOne(id: number): Promise<Ingrediente>
update(id: number, dto: UpdateIngredienteDto): Promise<Ingrediente>
remove(id: number): Promise<Ingrediente>                 // soft delete
registrarCompra(id: number, dto: RegistrarCompraDto): Promise<Ingrediente>
findAlertas(): Promise<Ingrediente[]>                     // stock <= stockMinimo
```

---

# Endpoints REST

Base: `inventario/ingredientes` (con el prefijo global `/api`, queda `/api/inventario/ingredientes`).

| Método | Ruta | Roles |
|---|---|---|
| POST | `/` | ADMIN, COCINA |
| GET | `/` | cualquier autenticado |
| GET | `/alertas` | cualquier autenticado |
| GET | `/:id` | cualquier autenticado |
| PATCH | `/:id` | ADMIN, COCINA |
| POST | `/:id/compra` | ADMIN, COCINA |
| DELETE | `/:id` | ADMIN, COCINA |

Estos endpoints son para administración manual del inventario (ej. desde una pantalla de cocina/admin). Pedidos no necesita llamarlos por HTTP — debe inyectar `InventarioService` directamente.

---

# Cómo integrar ambos módulos

En el módulo de Pedidos, importar `InventarioModule`:

```ts
@Module({
  imports: [
    InventarioModule,
    // ...
  ],
})
export class PedidosMesaModule {}
```

Después inyectar el servicio:

```ts
constructor(
  private readonly inventarioService: InventarioService,
) {}
```

No es necesario acceder directamente a la base de datos del módulo Inventario.

---

# Restricciones de integración

Para mantener una arquitectura desacoplada, Pedidos **NO debe**:

❌ Inyectar `Repository<Ingrediente>` directamente.

❌ Calcular o modificar `stock` / `costoUnitarioPromedio` manualmente — solo a través de `descontarStockDePlatillo()`.

❌ Duplicar la lógica de resolución de receta — `descontarStockDePlatillo()` ya llama a `RecetasService` internamente.

❌ Llamar a `PlatillosService.marcarNoDisponiblePorIngrediente()` directamente — eso es responsabilidad interna de Inventario.

❌ Ejecutar `descontarStockDePlatillo()` en la creación del pedido, ni en ningún estado distinto de la transición `En Cocina → Listo` (Regla 2 del proyecto).

---

# Dependencias entre módulos

```text
Pedidos
   │ utiliza
   ▼
InventarioService

Inventario
   │ utiliza
   ▼
RecetasService, PlatillosService
```

`InventarioModule` importa `RecetasModule` y `MenuModule` (para `RecetasService` y `PlatillosService` respectivamente). Ninguno de esos dos depende de Inventario, así que no hay dependencias circulares. Pedidos solo necesita depender de `InventarioModule`, no de `RecetasModule` ni `MenuModule` directamente para este flujo.

---

# Limitaciones conocidas (deuda técnica documentada)

1. **La notificación a `PlatillosService` no es transaccional.** `marcarNoDisponiblePorIngrediente()` se ejecuta contra el repositorio propio de Persona 2, no contra el `manager` que Pedidos pasa a `descontarStockDePlatillo()`. Si la transacción de Pedidos hace rollback *después* de que `descontarStockDePlatillo()` ya retornó (por ejemplo, falla un paso posterior al descuento dentro de la misma transacción), el stock revierte pero el platillo puede quedar marcado como no disponible incorrectamente. Hoy el impacto es nulo porque `PlatillosService.marcarNoDisponiblePorIngrediente()` es un stub vacío (`// Se implementará en la Fase 7`) — pero cuando Persona 2 lo implemente, vale la pena revisar esto en conjunto.
2. **El lock pesimista (`pessimistic_write`) solo se aplica cuando se pasa `manager`.** Sin transacción, dos pedidos concurrentes que descuenten el mismo ingrediente al mismo tiempo podrían sobrevender. Por eso es crítico siempre pasar el `manager` como se muestra en el ejemplo de arriba.
3. **No hay ajuste manual de stock** (mermas, conteo físico) ni tabla de historial de compras — fuera del alcance definido para Persona 3.

---

# Contrato de responsabilidades

## Persona 3 (Inventario)

Responsable de:

* Entidad `Ingrediente`.
* Gestión de stock y stock mínimo.
* Costo por unidad y costo promedio ponderado.
* Alertas de stock bajo mínimo.
* Descuento de ingredientes por platillo (`descontarStockDePlatillo`).
* Notificar a Menú cuando un ingrediente clave llega a stock 0.

## Persona 4 (Pedidos)

Responsable de:

* CRUD de Pedidos Mesa y Delivery.
* Cambios de estado del pedido.
* Abrir la transacción de base de datos en la transición `En Cocina → Listo` y pasar el `manager` a `descontarStockDePlatillo()` por cada platillo del pedido.
* Manejar el `BadRequestException` de stock insuficiente como un `400` hacia el cliente (el rollback ya ocurre automáticamente).
* Asignación de repartidores y tope de 3 pedidos "En Camino".

---

# Estado actual

## Implementado

* ✔ CRUD de Ingredientes.
* ✔ Control de stock y stock mínimo.
* ✔ Costo por unidad y costo promedio ponderado.
* ✔ Alertas de stock bajo mínimo.
* ✔ `descontarStockDePlatillo` con validación todo-o-nada, lock pesimista transaccional y respeto a `esIngredienteClave`.
* ✔ JWT + Roles.
* ✔ Swagger.
* ✔ DTOs y validaciones.
* ✔ `InventarioService` exportado para integración.
* ✔ 41 tests automatizados (entidad, DTOs, service, controller).

## Pendiente por Pedidos (Persona 4)

* Consumir `InventarioService.descontarStockDePlatillo()` dentro de `dataSource.transaction()` en la transición `En Cocina → Listo`.
* Manejar el error de stock insuficiente como `400 Bad Request` hacia el cliente.

---

# Recomendaciones finales

* Siempre pasar el `manager` transaccional a `descontarStockDePlatillo()` — es lo que garantiza el rollback automático y el lock contra sobreventa.
* No dupliques la resolución de receta: Inventario ya la resuelve internamente.
* Si en el futuro necesitas una nueva interacción con Inventario, pídela como un nuevo método público en `InventarioService`, evitando acceso directo a `Repository<Ingrediente>`.
* Revisa la sección "Limitaciones conocidas" antes de asumir que todo el flujo es 100% atómico extremo a extremo.
