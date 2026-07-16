import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Pago, CanalPedido } from './entities/pago.entity';
import { RegistrarPagoDto } from './dto/registrar-pago.dto';
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
  async registrarPago(dto: RegistrarPagoDto, cajeroId: number): Promise<Pago> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      if (dto.canal === CanalPedido.MESA) {
        const pedido = await manager.findOne(PedidoMesa, {
          where: { id: dto.pedidoId },
        });
        this.validarPedidoCobrable(pedido, pedido?.estado === EstadoPedidoMesa.PAGADO);

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

  private validarPedidoCobrable(
    pedido: unknown | null,
    yaPagado: boolean,
  ): void {
    if (!pedido) {
      throw new NotFoundException('El pedido indicado no existe.');
    }
    if (yaPagado) {
      throw new BadRequestException('El pedido ya está pagado.');
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
    cajeroId: number,
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
