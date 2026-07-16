import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PedidoMesa, EstadoPedidoMesa } from './entities/pedido-mesa.entity';
import { DetallePedidoMesa } from './entities/detalle-pedido-mesa.entity';
import { CreatePedidoMesaDto } from './dto/create-pedido-mesa.dto';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Platillo } from '../menu/platillos/entities/platillo.entity';
import { InventarioService } from '../inventario/inventario.service';

@Injectable()
export class PedidosMesaService {
  constructor(
    @InjectRepository(PedidoMesa)
    private readonly pedidoRepository: Repository<PedidoMesa>,
    private readonly dataSource: DataSource,
    private readonly inventarioService: InventarioService,
  ) {}

  async create(dto: CreatePedidoMesaDto, meseroId: string): Promise<PedidoMesa> {
    return await this.dataSource.transaction(async (manager) => {
      const mesero = await manager.findOne(Usuario, { where: { id: meseroId } });
      if (!mesero) throw new NotFoundException('Mesero no encontrado');

      const pedido = manager.create(PedidoMesa, {
        numeroMesa: dto.numeroMesa,
        mesero,
        detalles: [],
      });

      for (const det of dto.detalles) {
        const platillo = await manager.findOne(Platillo, { where: { id: det.platilloId } });
        if (!platillo || !platillo.disponible) {
          throw new BadRequestException(`Platillo ${det.platilloId} no disponible`);
        }
        const detalle = manager.create(DetallePedidoMesa, {
          platillo,
          cantidad: det.cantidad,
          precioUnitario: platillo.precio,
        });
        pedido.detalles.push(detalle);
      }
      return await manager.save(pedido);
    });
  }

  async findAll(): Promise<PedidoMesa[]> {
    return await this.pedidoRepository.find();
  }

  async updateEstado(id: number, estado: EstadoPedidoMesa): Promise<PedidoMesa> {
    if (estado === EstadoPedidoMesa.LISTO) {
      return await this.dataSource.transaction(async (manager) => {
        const pedido = await manager.findOne(PedidoMesa, { where: { id }, relations: { detalles: true } });
        if (!pedido || pedido.estado !== EstadoPedidoMesa.EN_COCINA) {
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
    pedido.estado = estado;
    return await this.pedidoRepository.save(pedido);
  }
}
