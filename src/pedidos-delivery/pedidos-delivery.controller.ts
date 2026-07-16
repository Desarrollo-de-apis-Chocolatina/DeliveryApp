import { Controller, Post, Body, Get, Patch, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { PedidosDeliveryService } from './pedidos-delivery.service';
import { CreatePedidoDeliveryDto } from './dto/create-pedido-delivery.dto';
import { EstadoPedidoDelivery } from './entities/pedido-delivery.entity';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../usuarios/entities/usuario.entity';

@ApiTags('pedidos-delivery')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pedidos-delivery')
export class PedidosDeliveryController {
  constructor(private readonly pedidosDeliveryService: PedidosDeliveryService) {}

  @Post()
  // Puede crearlo cualquiera (incluso sin login) o un CAJERO, ajustamos según negocio.
  // Asumiremos que el CAJERO o ADMIN toman pedidos por teléfono.
  @Roles(Rol.CAJERO, Rol.ADMIN)
  create(@Body() createPedidoDeliveryDto: CreatePedidoDeliveryDto) {
    return this.pedidosDeliveryService.create(createPedidoDeliveryDto);
  }

  @Get()
  @Roles(Rol.CAJERO, Rol.COCINA, Rol.REPARTIDOR, Rol.ADMIN)
  findAll() {
    return this.pedidosDeliveryService.findAll();
  }

  @Patch(':id/estado')
  @Roles(Rol.CAJERO, Rol.COCINA, Rol.REPARTIDOR, Rol.ADMIN)
  updateEstado(@Param('id', ParseIntPipe) id: number, @Body('estado') estado: EstadoPedidoDelivery) {
    return this.pedidosDeliveryService.updateEstado(id, estado);
  }

  @Patch(':id/asignar-repartidor/:repartidorId')
  @Roles(Rol.CAJERO, Rol.ADMIN)
  assignRepartidor(
    @Param('id', ParseIntPipe) id: number,
    @Param('repartidorId', ParseIntPipe) repartidorId: number,
  ) {
    return this.pedidosDeliveryService.assignRepartidor(id, repartidorId);
  }
}
