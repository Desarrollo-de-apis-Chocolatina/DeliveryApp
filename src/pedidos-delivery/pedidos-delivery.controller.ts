import { Controller, Post, Body, Get, Patch, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { PedidosDeliveryService } from './pedidos-delivery.service';
import { CreatePedidoDeliveryDto } from './dto/create-pedido-delivery.dto';
import { EstadoPedidoDelivery } from './entities/pedido-delivery.entity';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
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

  @ApiOperation({
    summary: 'Crear un pedido de delivery',
    description:
      'Registra un nuevo pedido de delivery, normalmente tomado por teléfono por un cajero o administrador.',
  })
  @ApiResponse({ status: 201, description: 'Pedido de delivery creado correctamente.' })
  @ApiResponse({ status: 400, description: 'Datos del pedido inválidos.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({ status: 403, description: 'No autorizado para esta acción.' })
  @Post()
  // Puede crearlo cualquiera (incluso sin login) o un CAJERO, ajustamos según negocio.
  // Asumiremos que el CAJERO o ADMIN toman pedidos por teléfono.
  @Roles(Rol.CAJERO, Rol.ADMIN)
  create(@Body() createPedidoDeliveryDto: CreatePedidoDeliveryDto) {
    return this.pedidosDeliveryService.create(createPedidoDeliveryDto);
  }

  @ApiOperation({
    summary: 'Listar pedidos de delivery',
    description: 'Devuelve todos los pedidos de delivery registrados.',
  })
  @ApiResponse({ status: 200, description: 'Lista de pedidos de delivery.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({ status: 403, description: 'No autorizado para esta acción.' })
  @Get()
  @Roles(Rol.CAJERO, Rol.COCINA, Rol.REPARTIDOR, Rol.ADMIN)
  findAll() {
    return this.pedidosDeliveryService.findAll();
  }

  @ApiOperation({
    summary: 'Actualizar el estado de un pedido de delivery',
    description:
      'Cambia el estado del pedido de delivery identificado por su ID (por ejemplo: EN_COCINA, LISTO, EN_CAMINO, ENTREGADO, PAGADO).',
  })
  @ApiResponse({ status: 200, description: 'Estado del pedido actualizado.' })
  @ApiResponse({ status: 400, description: 'Estado inválido.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({ status: 403, description: 'No autorizado para esta acción.' })
  @ApiResponse({ status: 404, description: 'Pedido de delivery no encontrado.' })
  @Patch(':id/estado')
  @Roles(Rol.CAJERO, Rol.COCINA, Rol.REPARTIDOR, Rol.ADMIN)
  updateEstado(@Param('id', ParseIntPipe) id: number, @Body('estado') estado: EstadoPedidoDelivery) {
    return this.pedidosDeliveryService.updateEstado(id, estado);
  }

  @ApiOperation({
    summary: 'Asignar un repartidor a un pedido de delivery',
    description:
      'Asocia el repartidor indicado al pedido de delivery identificado por su ID.',
  })
  @ApiResponse({ status: 200, description: 'Repartidor asignado al pedido.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({ status: 403, description: 'No autorizado para esta acción.' })
  @ApiResponse({ status: 404, description: 'Pedido o repartidor no encontrado.' })
  @Patch(':id/asignar-repartidor/:repartidorId')
  @Roles(Rol.CAJERO, Rol.ADMIN)
  assignRepartidor(
    @Param('id', ParseIntPipe) id: number,
    @Param('repartidorId', ParseIntPipe) repartidorId: number,
  ) {
    return this.pedidosDeliveryService.assignRepartidor(id, repartidorId);
  }
}
