# Diseño: validar entrega antes de cobrar en caja

## Contexto

`CajaService.registrarPago` (canal MESA o DELIVERY) actualmente solo valida que
el pedido exista y que no esté ya `PAGADO` antes de marcarlo como pagado. No
valida que el pedido haya llegado al estado `ENTREGADO`, por lo que hoy es
posible cobrar un pedido que sigue `TOMADO`, `EN_COCINA`, `LISTO` o (en
delivery) `EN_CAMINO`.

## Requisito

Ningún pedido, sea de mesa o delivery, debe poder marcarse como pagado hasta
que su estado sea `ENTREGADO`.

## Diseño

Generalizar el método privado `validarPedidoCobrable` en
`src/caja/caja.service.ts` para que reciba también el estado actual del
pedido y valide, en este orden:

1. Pedido no existe → `NotFoundException`.
2. Pedido ya `PAGADO` → `BadRequestException('El pedido ya está pagado.')`.
3. Pedido no está `ENTREGADO` → `BadRequestException('El pedido no ha sido entregado, no se puede cobrar.')`.

`EstadoPedidoMesa.ENTREGADO` y `EstadoPedidoDelivery.ENTREGADO` son el mismo
literal de string (`'ENTREGADO'`), igual que `PAGADO`. Esto permite mantener
una sola función de validación compartida entre los dos canales, sin
duplicar lógica ni introducir un tipo genérico nuevo.

El resto del flujo (cálculo de monto, creación del `Pago`, transacción)
no cambia.

## Fuera de alcance

- No se toca el controller (`caja.controller.ts`) ni el DTO
  (`registrar-pago.dto.ts`).
- No se toca el flujo de cambio de estado de los pedidos
  (`pedidos-mesa`/`pedidos-delivery` services), que ya es responsable de
  llevar el pedido a `ENTREGADO`.
- No se agrega un guard ni validación a nivel de entidad; queda contenida en
  `CajaService`, igual que la validación de "ya pagado" existente.

## Pruebas

Agregar a `caja.service.spec.ts`, dentro de `describe('registrarPago')`:

- Lanza `BadRequestException` si el pedido de mesa está en un estado distinto
  de `ENTREGADO` (p. ej. `EN_COCINA`), y `manager.save` no se llega a llamar.
- Lanza `BadRequestException` si el pedido de delivery está en un estado
  distinto de `ENTREGADO` (p. ej. `EN_CAMINO`), y `manager.save` no se llega
  a llamar.

Los tests existentes que ya construyen los pedidos "felices" con
`estado: EstadoPedidoMesa.ENTREGADO` / `EstadoPedidoDelivery.ENTREGADO`
seguirán pasando sin cambios.
