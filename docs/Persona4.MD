# Guía de Integración y Funcionamiento – Persona 4 (Pedidos y Repartidores)

## Objetivo
Este documento explica la implementación y funcionamiento de los módulos desarrollados por la **Persona 4**: Gestión de Repartidores, Pedidos de Mesa y Pedidos de Delivery. 
Se detalla la arquitectura, las decisiones de negocio clave y cómo se integra con el módulo de Inventario (Persona 3).

---

# ¿Qué implementó Persona 4?

```text
src/
├── repartidores/
│   ├── entities/repartidor.entity.ts
│   ├── dto/...
│   ├── repartidores.service.ts
│   ├── repartidores.controller.ts
│   └── repartidores.module.ts
├── pedidos-mesa/
│   ├── entities/
│   │   ├── pedido-mesa.entity.ts
│   │   └── detalle-pedido-mesa.entity.ts
│   ├── dto/...
│   ├── pedidos-mesa.service.ts
│   ├── pedidos-mesa.controller.ts
│   └── pedidos-mesa.module.ts
└── pedidos-delivery/
    ├── entities/
    │   ├── pedido-delivery.entity.ts
    │   └── detalle-pedido-delivery.entity.ts
    ├── dto/...
    ├── pedidos-delivery.service.ts
    ├── pedidos-delivery.controller.ts
    └── pedidos-delivery.module.ts
```

## Funcionalidades implementadas

* **CRUD de Repartidores**: Separado lógicamente del `Usuario` a través de una relación One-to-One.
* **Gestión de Pedidos de Mesa**: Relacionados a un `Mesero` (Usuario) y a un número de mesa.
* **Gestión de Pedidos Delivery**: Relacionados a un `Repartidor` y a una dirección de entrega.
* **Integración Transaccional con Inventario**: Al pasar un pedido a estado `LISTO`, se descuenta el inventario de manera atómica (Regla de negocio crítica).
* **Control de Asignaciones**: Un repartidor no puede tener más de 3 pedidos de delivery activos (en estado `EN_CAMINO`) al mismo tiempo.
* **Protección mediante JWT + Roles**: Uso estricto de Guards (`RolesGuard`) para que solo los roles pertinentes ejecuten acciones específicas (ej. solo Meseros pueden crear pedidos de mesa).

---

# Decisiones de negocio importantes

## 1. Entidad `Repartidor` Desacoplada
Se decidió no sobrecargar la tabla `Usuario` con campos como `vehiculo`, `placa` y `disponible`.
En su lugar, se creó una entidad `Repartidor` con una relación `@OneToOne` hacia `Usuario`.
- **Ventaja**: Evita columnas `null` en otros roles, respeta el Principio de Responsabilidad Única (SRP) y permite escalar fácilmente los atributos logísticos.

## 2. Límite de Pedidos Concurrentes para Repartidores
Al asignar un repartidor a un pedido de delivery (estado `EN_CAMINO`), el sistema verifica cuántos pedidos activos tiene el repartidor actualmente.
- Si tiene 3 o más, se lanza una `BadRequestException`. Esto evita saturación logística y cuellos de botella en las entregas.

## 3. Descuento de Inventario Transaccional (Regla 2)
El descuento de inventario **solo** ocurre durante la transición de estado: `EN_COCINA` ➔ `LISTO`.
Este proceso está envuelto en un `dataSource.transaction()` que pasa el `EntityManager` al `InventarioService`.
Si algún ingrediente se queda sin stock durante el bucle de detalles del pedido, la transacción hace **rollback** completo de manera automática.

---

# Endpoints REST y Roles

Todas las rutas tienen el prefijo `/api/`.

## Repartidores (`/api/repartidores`)
| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| POST | `/` | ADMIN | Crear un repartidor vinculado a un usuario existente o nuevo. |
| GET | `/` | ADMIN, CAJERO | Listar todos los repartidores. |
| PATCH| `/:id/disponibilidad` | ADMIN, CAJERO | Cambiar el estado `disponible` (true/false). |

## Pedidos de Mesa (`/api/pedidos-mesa`)
| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| POST | `/` | MESERO, ADMIN | Crea un pedido (captura el ID del mesero desde el JWT `req.user.sub`). |
| GET | `/` | MESERO, COCINA, CAJERO, ADMIN | Lista todos los pedidos de mesa. |
| PATCH| `/:id/estado` | MESERO, COCINA, ADMIN | Avanza el estado (`TOMADO` ➔ `EN_COCINA` ➔ `LISTO` ➔ `ENTREGADO` ➔ `PAGADO`). |

## Pedidos Delivery (`/api/pedidos-delivery`)
| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| POST | `/` | CAJERO, ADMIN | Crea un pedido para llevar a una dirección. |
| GET | `/` | CAJERO, COCINA, REPARTIDOR, ADMIN | Lista los pedidos de delivery. |
| PATCH| `/:id/estado` | CAJERO, COCINA, REPARTIDOR, ADMIN | Cambia el estado del pedido. |
| PATCH| `/:id/asignar-repartidor/:repartidorId` | CAJERO, ADMIN | Asigna el repartidor (Valida la regla de max 3 pedidos). |

---

# Flujo Crítico: Transición a LISTO (Descuento de Inventario)

Este es el bloque de código crítico implementado en `PedidosMesaService` y `PedidosDeliveryService` para cumplir con las directrices de Persona 3:

```typescript
async updateEstado(id: number, estado: EstadoPedidoMesa): Promise<PedidoMesa> {
  if (estado === EstadoPedidoMesa.LISTO) {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Obtener pedido con detalles usando el manager
      const pedido = await manager.findOne(PedidoMesa, { where: { id }, relations: { detalles: true } });
      
      if (!pedido || pedido.estado !== EstadoPedidoMesa.EN_COCINA) {
        throw new BadRequestException('El pedido debe estar EN_COCINA para pasar a LISTO');
      }

      // 2. Descontar cada detalle usando el InventarioService importado
      for (const detalle of pedido.detalles) {
        await this.inventarioService.descontarStockDePlatillo(
          detalle.platillo.id,
          detalle.cantidad,
          manager // ¡CRÍTICO! Pasar el manager para heredar la transacción
        );
      }

      // 3. Guardar el nuevo estado
      pedido.estado = estado;
      return await manager.save(pedido);
    });
  }

  // Lógica para otros estados...
}
```

## Dependencias de Módulo
Para que esto funcione, los módulos `PedidosMesaModule` y `PedidosDeliveryModule` importan `InventarioModule` e inyectan `InventarioService`.
**Pedidos nunca manipula los repositorios de Inventario de manera directa**.

---

# Estado Actual
- ✔️ CRUD de Repartidores
- ✔️ Flujo de Pedidos de Mesa
- ✔️ Flujo de Pedidos Delivery
- ✔️ Integración con JWT (Rol validation e inyección de UUID por `req.user.sub`)
- ✔️ Integración segura y transaccional con `InventarioService`
- ✔️ Colección de Postman Generada cubriendo todo el ciclo (incluido login separado por Roles).
