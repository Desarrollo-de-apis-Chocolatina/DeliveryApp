import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PedidoDelivery, EstadoPedidoDelivery } from './entities/pedido-delivery.entity';
import { DetallePedidoDelivery } from './entities/detalle-pedido-delivery.entity';
import { CreatePedidoDeliveryDto } from './dto/create-pedido-delivery.dto';
import { Platillo } from '../menu/platillos/entities/platillo.entity';
import { Repartidor } from '../repartidores/entities/repartidor.entity';
import { InventarioService } from '../inventario/inventario.service';

@Injectable()
export class PedidosDeliveryService {
  constructor(
    @InjectRepository(PedidoDelivery)
    private readonly pedidoRepository: Repository<PedidoDelivery>,
    @InjectRepository(Repartidor)
    private readonly repartidorRepository: Repository<Repartidor>,
    private readonly dataSource: DataSource,
    private readonly inventarioService: InventarioService,
  ) {}

  async create(dto: CreatePedidoDeliveryDto): Promise<PedidoDelivery> {
    return await this.dataSource.transaction(async (manager) => {
      const pedido = manager.create(PedidoDelivery, {
        direccion: dto.direccion,
        detalles: [],
      });

      for (const det of dto.detalles) {
        const platillo = await manager.findOne(Platillo, { where: { id: det.platilloId } });
        if (!platillo || !platillo.disponible) {
          throw new BadRequestException(`Platillo ${det.platilloId} no disponible`);
        }
        const detalle = manager.create(DetallePedidoDelivery, {
          platillo,
          cantidad: det.cantidad,
          precioUnitario: platillo.precio,
        });
        pedido.detalles.push(detalle);
      }
      return await manager.save(pedido);
    });
  }

  async findAll(): Promise<PedidoDelivery[]> {
    return await this.pedidoRepository.find();
  }

  async updateEstado(id: number, estado: EstadoPedidoDelivery): Promise<PedidoDelivery> {
    if (estado === EstadoPedidoDelivery.PAGADO) {
      throw new BadRequestException(
        'El pedido se marca como PAGADO únicamente al registrar el cobro en POST /caja/pagos.',
      );
    }

    if (estado === EstadoPedidoDelivery.EN_CAMINO) {
      throw new BadRequestException(
        'El pedido debe pasar a EN_CAMINO asignando un repartidor en POST /api/pedidos-delivery/:id/asignar-repartidor',
      );
    }

    const TRANSICIONES_PERMITIDAS: Record<EstadoPedidoDelivery, EstadoPedidoDelivery[]> = {
      [EstadoPedidoDelivery.TOMADO]: [EstadoPedidoDelivery.EN_COCINA],
      [EstadoPedidoDelivery.EN_COCINA]: [EstadoPedidoDelivery.LISTO],
      [EstadoPedidoDelivery.LISTO]: [],
      [EstadoPedidoDelivery.EN_CAMINO]: [EstadoPedidoDelivery.ENTREGADO],
      [EstadoPedidoDelivery.ENTREGADO]: [],
      [EstadoPedidoDelivery.PAGADO]: [],
    };

    if (estado === EstadoPedidoDelivery.LISTO) {
      return await this.dataSource.transaction(async (manager) => {
        const pedido = await manager.findOne(PedidoDelivery, { where: { id }, relations: { detalles: true } });
        if (!pedido) throw new NotFoundException('Pedido no encontrado');
        if (pedido.estado !== EstadoPedidoDelivery.EN_COCINA) {
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

    const permitidos = TRANSICIONES_PERMITIDAS[pedido.estado] || [];
    if (!permitidos.includes(estado)) {
      throw new BadRequestException(
        `Transición de estado no válida de ${pedido.estado} a ${estado}`,
      );
    }

    pedido.estado = estado;
    return await this.pedidoRepository.save(pedido);
  }

  async assignRepartidor(pedidoId: number, repartidorId: number): Promise<PedidoDelivery> {
    const repartidor = await this.repartidorRepository.findOne({ where: { id: repartidorId } });
    if (!repartidor || !repartidor.disponible) {
      throw new BadRequestException('Repartidor no disponible');
    }

    const activeOrders = await this.pedidoRepository.count({
      where: {
        repartidor: { id: repartidorId },
        estado: EstadoPedidoDelivery.EN_CAMINO,
      },
    });

    if (activeOrders >= 3) {
      throw new BadRequestException('El repartidor ya tiene 3 pedidos activos en camino');
    }

    const pedido = await this.pedidoRepository.findOne({ where: { id: pedidoId } });
    if (!pedido) throw new NotFoundException('Pedido no encontrado');
    if (pedido.estado !== EstadoPedidoDelivery.LISTO) {
      throw new BadRequestException('El pedido debe estar LISTO para asignarse y enviarse');
    }

    pedido.repartidor = repartidor;
    pedido.estado = EstadoPedidoDelivery.EN_CAMINO;
    return await this.pedidoRepository.save(pedido);
  }
}
