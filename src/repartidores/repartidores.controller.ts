import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { RepartidoresService } from './repartidores.service';
import { CreateRepartidorDto } from './dto/create-repartidor.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../usuarios/entities/usuario.entity';

@ApiTags('repartidores')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('repartidores')
export class RepartidoresController {
  constructor(private readonly repartidoresService: RepartidoresService) {}

  @ApiOperation({
    summary: 'Crear un repartidor',
    description: 'Registra un nuevo repartidor en el sistema.',
  })
  @ApiResponse({ status: 201, description: 'Repartidor creado correctamente.' })
  @ApiResponse({ status: 400, description: 'Datos del repartidor inválidos.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({ status: 403, description: 'No autorizado para esta acción.' })
  @Post()
  @Roles(Rol.ADMIN)
  create(@Body() createRepartidorDto: CreateRepartidorDto) {
    return this.repartidoresService.create(createRepartidorDto);
  }

  @ApiOperation({
    summary: 'Listar repartidores',
    description: 'Devuelve todos los repartidores registrados.',
  })
  @ApiResponse({ status: 200, description: 'Lista de repartidores.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({ status: 403, description: 'No autorizado para esta acción.' })
  @Get()
  @Roles(Rol.ADMIN)
  findAll() {
    return this.repartidoresService.findAll();
  }
}
