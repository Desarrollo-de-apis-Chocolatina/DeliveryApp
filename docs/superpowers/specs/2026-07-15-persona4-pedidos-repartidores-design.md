# Design Spec: Persona 4 - Pedidos y Repartidores

## 1. Visión General
Implementación de los módulos de Pedidos (Mesa y Delivery) y Repartidores para el backend de DeliveryApp. Se integrará de manera transaccional con el módulo de Inventario existente para descontar stock automáticamente.

## 2. Componentes

### 2.1 Módulo Repartidores
- **Entidad `Repartidor`**: Relación 1-1 con `Usuario` (`usuarioId`), incluye `vehiculo`, `placa`, `disponible`.
- **Creación Unificada**: El endpoint de creación de repartidor (`POST /repartidores`) creará tanto el registro en la tabla `usuarios` (con rol `REPARTIDOR`) como en la tabla `repartidores` mediante una transacción de base de datos.
- **CRUD**: Endpoints básicos para listar, actualizar y borrar (soft-delete).

### 2.2 Módulo Pedidos Mesa
- **Entidades**: `PedidoMesa` y `DetallePedidoMesa`.
- **Estados**: `TOMADO` -> `EN_COCINA` -> `LISTO` -> `ENTREGADO` -> `PAGADO` (Manejados vía un Enum de TypeScript en el mismo módulo).
- **Flujo de Inventario**: Al transicionar de `EN_COCINA` a `LISTO`, se abrirá una transacción de TypeORM. Se iterarán los detalles del pedido invocando `InventarioService.descontarStockDePlatillo(platilloId, cantidad, manager)`. Si falla por falta de stock, la transacción hace rollback y el pedido permanece `EN_COCINA`.

### 2.3 Módulo Pedidos Delivery
- **Entidades**: `PedidoDelivery` y `DetallePedidoDelivery`.
- **Estados**: `TOMADO` -> `EN_COCINA` -> `LISTO` -> `EN_CAMINO` -> `ENTREGADO` -> `PAGADO`.
- **Flujo de Inventario**: Mismo flujo transaccional que los pedidos de mesa.
- **Asignación de Repartidores**: Cuando el pedido pase a `EN_CAMINO` y se le asigne un repartidor, el sistema validará que dicho repartidor no tenga 3 o más pedidos con estado `EN_CAMINO`. Si los tiene, se lanza un `BadRequestException`.

## 3. Manejo de Errores
- Excepciones controladas a nivel de validación de negocio (`BadRequestException` si se excede el límite de pedidos por repartidor).
- Se dejará fluir el `BadRequestException` proveniente del `InventarioService` hacia el cliente cuando haya falta de stock.

## 4. Tests
- Confirmación manual a través de Swagger de la transición de estado.
- Verificación del descuento correcto en la tabla de ingredientes y activación del límite de 3 envíos por repartidor.
