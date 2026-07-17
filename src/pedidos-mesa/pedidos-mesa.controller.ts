import { Controller, Post, Body, Get, Patch, Param, UseGuards, ParseIntPipe, Req } from '@nestjs/common';
import { PedidosMesaService } from './pedidos-mesa.service';
import { CreatePedidoMesaDto } from './dto/create-pedido-mesa.dto';
import { CambiarEstadoMesaDto } from './dto/cambiar-estado.dto';
import { AgregarDetallesDto } from './dto/agregar-detalles.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../usuarios/entities/usuario.entity';

@ApiTags('pedidos-mesa')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pedidos-mesa')
export class PedidosMesaController {
  constructor(private readonly pedidosMesaService: PedidosMesaService) {}

  @ApiOperation({
    summary: 'Crear un pedido de mesa',
    description:
      'Registra un nuevo pedido asociado a una mesa y al mesero autenticado.',
  })
  @ApiResponse({ status: 201, description: 'Pedido de mesa creado correctamente.' })
  @ApiResponse({ status: 400, description: 'Datos del pedido inválidos.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({ status: 403, description: 'No autorizado para esta acción.' })
  @Post()
  @Roles(Rol.MESERO, Rol.ADMIN)
  create(@Body() createPedidoMesaDto: CreatePedidoMesaDto, @Req() req: any) {
    return this.pedidosMesaService.create(createPedidoMesaDto, req.user.sub);
  }

  @ApiOperation({
    summary: 'Listar pedidos de mesa',
    description: 'Devuelve todos los pedidos de mesa registrados.',
  })
  @ApiResponse({ status: 200, description: 'Lista de pedidos de mesa.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({ status: 403, description: 'No autorizado para esta acción.' })
  @Get()
  @Roles(Rol.MESERO, Rol.COCINA, Rol.CAJERO, Rol.ADMIN)
  findAll() {
    return this.pedidosMesaService.findAll();
  }

  @ApiOperation({
    summary: 'Actualizar el estado de un pedido de mesa',
    description:
      'Cambia el estado del pedido de mesa identificado por su ID (TOMADO, EN_COCINA, LISTO, ENTREGADO). El estado PAGADO no se puede fijar aquí: se marca automáticamente al registrar el cobro en POST /caja/pagos.',
  })
  @ApiResponse({ status: 200, description: 'Estado del pedido actualizado.' })
  @ApiResponse({
    status: 400,
    description:
      'Estado inválido, o se intentó fijar PAGADO directamente (debe hacerse vía POST /caja/pagos).',
  })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({ status: 403, description: 'No autorizado para esta acción.' })
  @ApiResponse({ status: 404, description: 'Pedido de mesa no encontrado.' })
  @Patch(':id/estado')
  @Roles(Rol.MESERO, Rol.COCINA, Rol.ADMIN)
  updateEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarEstadoMesaDto,
  ) {
    return this.pedidosMesaService.updateEstado(id, dto.estado);
  }

  @ApiOperation({
    summary: 'Agregar platillos a un pedido abierto de la mesa (misma cuenta)',
    description:
      'Si la mesa ya tiene un pedido en estado TOMADO o EN_COCINA, le agrega los platillos indicados (mismo pedidoId) en vez de crear un pedido nuevo. No aplica una vez el pedido pasa a LISTO.',
  })
  @ApiResponse({ status: 200, description: 'Detalles agregados al pedido existente.' })
  @ApiResponse({ status: 400, description: 'Platillo no disponible.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({ status: 403, description: 'No autorizado para esta acción.' })
  @ApiResponse({ status: 404, description: 'No hay pedido abierto para esa mesa.' })
  @Patch('mesa/:numeroMesa/detalles')
  @Roles(Rol.MESERO, Rol.ADMIN)
  agregarDetalles(
    @Param('numeroMesa', ParseIntPipe) numeroMesa: number,
    @Body() dto: AgregarDetallesDto,
  ) {
    return this.pedidosMesaService.agregarDetalles(numeroMesa, dto.detalles);
  }
}
