import { Controller, Post, Body, Get, Patch, Param, UseGuards, ParseIntPipe, Req } from '@nestjs/common';
import { PedidosMesaService } from './pedidos-mesa.service';
import { CreatePedidoMesaDto } from './dto/create-pedido-mesa.dto';
import { EstadoPedidoMesa } from './entities/pedido-mesa.entity';
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
      'Cambia el estado del pedido de mesa identificado por su ID (por ejemplo: EN_COCINA, LISTO, ENTREGADO, PAGADO).',
  })
  @ApiResponse({ status: 200, description: 'Estado del pedido actualizado.' })
  @ApiResponse({ status: 400, description: 'Estado inválido.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({ status: 403, description: 'No autorizado para esta acción.' })
  @ApiResponse({ status: 404, description: 'Pedido de mesa no encontrado.' })
  @Patch(':id/estado')
  @Roles(Rol.MESERO, Rol.COCINA, Rol.ADMIN)
  updateEstado(@Param('id', ParseIntPipe) id: number, @Body('estado') estado: EstadoPedidoMesa) {
    return this.pedidosMesaService.updateEstado(id, estado);
  }
}
