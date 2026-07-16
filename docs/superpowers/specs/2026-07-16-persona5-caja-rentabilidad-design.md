# Diseño — Persona 5: Caja, Rentabilidad & QA/Docs

**Fecha:** 2026-07-16
**Autor:** Persona 5 (@Melisa Rivas)
**Entrega:** 2026-07-17 13:00

## Problema

El proyecto necesita cerrar el ciclo financiero y de calidad del backend del restaurante:
cierre de caja diario, rentabilidad por platillo, cobertura de pruebas ≥ 70% y documentación
final (Swagger + Postman). Los módulos de base (P1), menú/recetas (P2), inventario (P3) y
pedidos/repartidores (P4) ya están construidos.

## Restricción clave descubierta

Las entidades de pedido de P4 **no almacenan tipo de pago ni propina**, y no persisten un `total`.
Los pedidos de mesa y delivery viven en **dos módulos separados** con IDs enteros. La guía de
integración autoriza resolver esto con una "tabla de cobros".

## Decisión de diseño

Modelar el cobro con una **entidad propia `Pago`** dentro de `CajaModule`, en lugar de modificar
las entidades ya finalizadas de P4. Ventajas: autocontenido, no toca código de otra persona,
suma una entidad relacionada (bueno para la rúbrica), y desacopla Caja de la implementación de
Pedidos (accede por repositorio, no por exports de P4).

### CajaModule
- **Entidad `Pago`**: `canal` (MESA|DELIVERY), `pedidoMesaId`/`pedidoDeliveryId` (int, uno u otro),
  `monto` (decimal), `propina` (decimal, default 0), `tipoPago` (EFECTIVO|TARJETA|TRANSFERENCIA),
  `cajeroId` (uuid, ref. a `Usuario.id`), `createdAt`. Decimales con `decimalTransformer`.
- **`registrarPago(dto, cajeroId)`**: transacción — carga el pedido por canal, valida (no inexistente,
  no ya pagado), calcula `monto = Σ precioUnitario × cantidad` (con `Number()`), crea el `Pago` y
  marca el pedido `PAGADO`.
- **`cierreDiario(fecha)`**: agrega los `Pago` del día → ventas, propinas, desglose por tipo de pago,
  ventas del día anterior y `variacionPct = ((hoy − ayer)/ayer)×100` (`null` si ayer = 0).
- Endpoints: `POST /api/caja/pagos`, `GET /api/caja/cierre-diario?fecha=YYYY-MM-DD`. Rol ADMIN/CAJERO.

### RentabilidadModule (solo lectura)
- `margenesPorPlatillo()`: por cada platillo (todos, disponibles o no), `costoReceta = Σ
  (cantidadPorPorcion × costoUnitarioPromedio)` cruzando `RecetasService.findByPlatillo` con
  `InventarioService.findOne`; `margenNominal = Number(precio) − costoReceta`; `margenPct`.
  Omite ingredientes inexistentes sin abortar. Ordena desc por margen.
- Endpoint: `GET /api/rentabilidad/platillos`. Rol ADMIN/CAJERO.

### QA
- Config de cobertura: `coveragePathIgnorePatterns` para excluir modules/entities/dtos/config/seeds
  del denominador; `coverageThreshold` global 70 una vez alcanzado.
- Specs unitarios (patrón `inventario.service.spec.ts`) para todos los módulos + e2e del flujo con
  el escenario de inventario insuficiente (400 + rollback).

### Docs
- Swagger consolidado (`@ApiOperation`/`@ApiResponse`/`@ApiProperty` donde faltan) y colección
  Postman en `docs/postman/` con el flujo completo.

## Alternativa descartada
Agregar columnas `tipoPago`/`propina` a `PedidoMesa` y `PedidoDelivery`: modificaba código
finalizado de P4 y requería coordinación a un día de la entrega. Descartada por acoplamiento y riesgo.
