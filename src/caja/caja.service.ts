import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, EntityManager, Repository } from 'typeorm';
import { Pago, CanalPedido, TipoPago } from './entities/pago.entity';
import { RegistrarPagoDto } from './dto/registrar-pago.dto';
import { CierreDiarioDto } from './dto/cierre-diario.dto';
import {
  PedidoMesa,
  EstadoPedidoMesa,
} from '../pedidos-mesa/entities/pedido-mesa.entity';
import {
  PedidoDelivery,
  EstadoPedidoDelivery,
} from '../pedidos-delivery/entities/pedido-delivery.entity';

interface DetalleConMonto {
  precioUnitario: number | string;
  cantidad: number;
}

@Injectable()
export class CajaService {
  constructor(
    @InjectRepository(Pago)
    private readonly pagoRepository: Repository<Pago>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Registra el cobro de un pedido: calcula el monto desde sus detalles, crea
   * el registro de `Pago` (con tipo de pago y propina) y marca el pedido como
   * PAGADO. Todo dentro de una transacción para que el pago y el cambio de
   * estado sean atómicos.
   */
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

  /**
   * Genera el cierre de caja de una fecha (formato YYYY-MM-DD): ventas totales,
   * propinas, desglose por tipo de pago y comparativa vs el día anterior.
   */
  async cierreDiario(fecha: string): Promise<CierreDiarioDto> {
    this.validarFechaCierre(fecha);

    const pagosHoy = await this.buscarPagosDelDia(fecha);
    const pagosAyer = await this.buscarPagosDelDia(this.diaAnterior(fecha));

    const ventasTotales = this.sumarMontos(pagosHoy);
    const ventasDiaAnterior = this.sumarMontos(pagosAyer);

    return {
      fecha,
      ventasTotales,
      propinasTotales: pagosHoy.reduce((t, p) => t + Number(p.propina), 0),
      porTipoPago: {
        [TipoPago.EFECTIVO]: this.sumarMontos(
          pagosHoy.filter((p) => p.tipoPago === TipoPago.EFECTIVO),
        ),
        [TipoPago.TARJETA]: this.sumarMontos(
          pagosHoy.filter((p) => p.tipoPago === TipoPago.TARJETA),
        ),
        [TipoPago.TRANSFERENCIA]: this.sumarMontos(
          pagosHoy.filter((p) => p.tipoPago === TipoPago.TRANSFERENCIA),
        ),
      },
      ventasDiaAnterior,
      variacionPct:
        ventasDiaAnterior === 0
          ? null
          : ((ventasTotales - ventasDiaAnterior) / ventasDiaAnterior) * 100,
    };
  }

  /**
   * Valida que `fecha` sea un día de calendario real (rechaza cosas como
   * "2026-13-40", que el `@Matches` del DTO no detecta) y que no sea futura.
   * El formato YYYY-MM-DD ya lo garantiza `CierreDiarioQueryDto`.
   */
  private validarFechaCierre(fecha: string): void {
    const fechaComoDate = new Date(`${fecha}T00:00:00.000`);
    if (Number.isNaN(fechaComoDate.getTime())) {
      throw new BadRequestException('La fecha indicada no es válida.');
    }

    const hoy = new Date().toISOString().slice(0, 10);
    if (fecha > hoy) {
      throw new BadRequestException('La fecha no puede ser futura.');
    }
  }

  private async buscarPagosDelDia(fecha: string): Promise<Pago[]> {
    const inicio = new Date(`${fecha}T00:00:00.000`);
    const fin = new Date(`${fecha}T23:59:59.999`);
    return await this.pagoRepository.find({
      where: { createdAt: Between(inicio, fin) },
    });
  }

  private diaAnterior(fecha: string): string {
    const d = new Date(`${fecha}T00:00:00.000`);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  private sumarMontos(pagos: Pago[]): number {
    return pagos.reduce((total, pago) => total + Number(pago.monto), 0);
  }

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

  private calcularMonto(detalles: DetalleConMonto[]): number {
    return (detalles ?? []).reduce(
      (total, detalle) => total + Number(detalle.precioUnitario) * detalle.cantidad,
      0,
    );
  }

  private async crearPago(
    manager: EntityManager,
    dto: RegistrarPagoDto,
    cajeroId: string,
    refs: {
      monto: number;
      pedidoMesaId: number | null;
      pedidoDeliveryId: number | null;
    },
  ): Promise<Pago> {
    const pago = manager.create(Pago, {
      canal: dto.canal,
      pedidoMesaId: refs.pedidoMesaId,
      pedidoDeliveryId: refs.pedidoDeliveryId,
      monto: refs.monto,
      propina: dto.propina ?? 0,
      tipoPago: dto.tipoPago,
      cajeroId,
    });
    return await manager.save(pago);
  }
}
