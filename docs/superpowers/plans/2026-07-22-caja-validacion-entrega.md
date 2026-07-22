# Validación de entrega antes de cobrar en caja — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ningún pedido (mesa o delivery) puede marcarse como `PAGADO` en `CajaService.registrarPago` a menos que su estado actual sea `ENTREGADO`.

**Architecture:** Cambio contenido en `src/caja/caja.service.ts`. Se generaliza el método privado `validarPedidoCobrable` para que reciba, además del pedido, dos flags booleanos (`estaEntregado`, `estaPagado`) calculados en cada call site contra el enum de estado específico del canal (`EstadoPedidoMesa` o `EstadoPedidoDelivery`). Esto evita duplicar la validación por canal y mantiene el chequeo type-safe (sin comparar contra strings sueltos).

**Tech Stack:** NestJS, TypeORM, Jest, class-validator (sin cambios de dependencias).

## Global Constraints

- No ejecutar `git add`, `git commit` ni `git push` en ningún paso — el control de versiones lo maneja la usuaria manualmente. Omitir los pasos "Commit" del template al ejecutar; dejar el working tree con los cambios sin stagear.
- Orden de validación al cobrar (de la spec): 1) pedido no existe → `NotFoundException`, 2) ya `PAGADO` → `BadRequestException('El pedido ya está pagado.')`, 3) no `ENTREGADO` → `BadRequestException('El pedido no ha sido entregado, no se puede cobrar.')`.
- No tocar `caja.controller.ts`, `registrar-pago.dto.ts`, ni los servicios de `pedidos-mesa`/`pedidos-delivery`.

---

### Task 1: Validar estado ENTREGADO en `CajaService.registrarPago`

**Files:**
- Modify: `src/caja/caja.service.ts:39-74` (call sites en `registrarPago`) y `:147-157` (`validarPedidoCobrable`)
- Test: `src/caja/caja.service.spec.ts` (dentro de `describe('registrarPago')`, después del test existente `'lanza BadRequestException si el pedido ya está PAGADO'`)

**Interfaces:**
- Consumes: `EstadoPedidoMesa` y `EstadoPedidoDelivery` (ya importados en `caja.service.ts:11-18`), en particular sus miembros `ENTREGADO` y `PAGADO`.
- Produces: `validarPedidoCobrable(pedido: unknown, estaEntregado: boolean, estaPagado: boolean): void` — firma nueva del método privado; no la consume ningún otro archivo.

- [ ] **Step 1: Escribir el test que falla — pedido de mesa no entregado**

Añadir en `src/caja/caja.service.spec.ts`, dentro de `describe('registrarPago')`, justo después del test `'lanza BadRequestException si el pedido ya está PAGADO'` (línea 126):

```typescript
    it('lanza BadRequestException si el pedido de mesa no ha sido entregado', async () => {
      manager.findOne.mockResolvedValue({
        id: 8,
        estado: EstadoPedidoMesa.EN_COCINA,
        detalles: [],
      });

      await expect(
        service.registrarPago(
          { canal: CanalPedido.MESA, pedidoId: 8, tipoPago: TipoPago.EFECTIVO },
          'cajero-uuid-5',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException si el pedido de delivery no ha sido entregado', async () => {
      manager.findOne.mockResolvedValue({
        id: 9,
        estado: EstadoPedidoDelivery.EN_CAMINO,
        detalles: [],
      });

      await expect(
        service.registrarPago(
          { canal: CanalPedido.DELIVERY, pedidoId: 9, tipoPago: TipoPago.EFECTIVO },
          'cajero-uuid-6',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(manager.save).not.toHaveBeenCalled();
    });
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `cd DeliveryApp && npx jest caja.service.spec.ts -t "no ha sido entregado"`
Expected: FAIL — ambos tests fallan porque `registrarPago` hoy marca el pedido como `PAGADO` sin validar el estado (`manager.save` sí se llama, o el `rejects.toThrow` no se cumple).

- [ ] **Step 3: Implementar el cambio mínimo**

En `src/caja/caja.service.ts`, reemplazar el bloque completo de `registrarPago` (líneas 39-74):

```typescript
  async registrarPago(dto: RegistrarPagoDto, cajeroId: string): Promise<Pago> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      if (dto.canal === CanalPedido.MESA) {
        const pedido = await manager.findOne(PedidoMesa, {
          where: { id: dto.pedidoId },
        });
        this.validarPedidoCobrable(
          pedido,
          pedido?.estado === EstadoPedidoMesa.ENTREGADO,
          pedido?.estado === EstadoPedidoMesa.PAGADO,
        );

        pedido!.estado = EstadoPedidoMesa.PAGADO;
        await manager.save(pedido!);

        return await this.crearPago(manager, dto, cajeroId, {
          monto: this.calcularMonto(pedido!.detalles),
          pedidoMesaId: pedido!.id,
          pedidoDeliveryId: null,
        });
      }

      const pedido = await manager.findOne(PedidoDelivery, {
        where: { id: dto.pedidoId },
      });
      this.validarPedidoCobrable(
        pedido,
        pedido?.estado === EstadoPedidoDelivery.ENTREGADO,
        pedido?.estado === EstadoPedidoDelivery.PAGADO,
      );

      pedido!.estado = EstadoPedidoDelivery.PAGADO;
      await manager.save(pedido!);

      return await this.crearPago(manager, dto, cajeroId, {
        monto: this.calcularMonto(pedido!.detalles),
        pedidoMesaId: null,
        pedidoDeliveryId: pedido!.id,
      });
    });
  }
```

Y reemplazar `validarPedidoCobrable` (líneas 147-157):

```typescript
  private validarPedidoCobrable(
    pedido: unknown | null,
    estaEntregado: boolean,
    estaPagado: boolean,
  ): void {
    if (!pedido) {
      throw new NotFoundException('El pedido indicado no existe.');
    }
    if (estaPagado) {
      throw new BadRequestException('El pedido ya está pagado.');
    }
    if (!estaEntregado) {
      throw new BadRequestException(
        'El pedido no ha sido entregado, no se puede cobrar.',
      );
    }
  }
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `cd DeliveryApp && npx jest caja.service.spec.ts`
Expected: PASS — los 2 tests nuevos y los 9 existentes en el archivo (incluye `cierreDiario`) pasan sin cambios.

- [ ] **Step 5: (Omitido) Commit**

No ejecutar — ver Global Constraints. Los cambios quedan sin stagear para que la usuaria los revise y commitee.

---

## Self-Review

- **Spec coverage:** los 3 pasos de validación de la spec (no existe / ya pagado / no entregado) están cubiertos por `validarPedidoCobrable` y probados en Step 1. El orden de validación coincide exactamente con la spec.
- **Placeholders:** ninguno — todo el código de los steps es literal, sin "TODO" ni "similar a".
- **Consistencia de tipos:** `validarPedidoCobrable(pedido, estaEntregado: boolean, estaPagado: boolean)` es la única firma nueva y se usa igual en ambos call sites (mesa y delivery); no hay otro archivo que la consuma.
