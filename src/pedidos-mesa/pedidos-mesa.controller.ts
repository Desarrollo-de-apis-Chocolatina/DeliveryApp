import { Controller, Post, Body, Get, Patch, Param, UseGuards, ParseIntPipe, Req } from '@nestjs/common';
import { PedidosMesaService } from './pedidos-mesa.service';
import { CreatePedidoMesaDto } from './dto/create-pedido-mesa.dto';
import { EstadoPedidoMesa } from './entities/pedido-mesa.entity';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
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

  @Post()
  @Roles(Rol.MESERO, Rol.ADMIN)
  create(@Body() createPedidoMesaDto: CreatePedidoMesaDto, @Req() req: any) {
    return this.pedidosMesaService.create(createPedidoMesaDto, req.user.sub);
  }

  @Get()
  @Roles(Rol.MESERO, Rol.COCINA, Rol.CAJERO, Rol.ADMIN)
  findAll() {
    return this.pedidosMesaService.findAll();
  }

  @Patch(':id/estado')
  @Roles(Rol.MESERO, Rol.COCINA, Rol.ADMIN)
  updateEstado(@Param('id', ParseIntPipe) id: number, @Body('estado') estado: EstadoPedidoMesa) {
    return this.pedidosMesaService.updateEstado(id, estado);
  }
}
