import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../usuarios/entities/usuario.entity';
import { InventarioService } from './inventario.service';
import { CreateIngredienteDto } from './dto/create-ingrediente.dto';
import { UpdateIngredienteDto } from './dto/update-ingrediente.dto';
import { RegistrarCompraDto } from './dto/registrar-compra.dto';

@ApiTags('Inventario')
@ApiBearerAuth()
@Controller('inventario/ingredientes')
export class InventarioController {
  constructor(private readonly inventarioService: InventarioService) {}

  @ApiOperation({ summary: 'Crear un ingrediente' })
  @ApiResponse({
    status: 201,
    description: 'Ingrediente creado correctamente.',
  })
  @Roles(Rol.ADMIN, Rol.COCINA)
  @Post()
  create(@Body() createIngredienteDto: CreateIngredienteDto) {
    return this.inventarioService.create(createIngredienteDto);
  }

  @ApiOperation({ summary: 'Listar ingredientes' })
  @ApiResponse({ status: 200, description: 'Lista de ingredientes.' })
  @Get()
  findAll() {
    return this.inventarioService.findAll();
  }

  @ApiOperation({
    summary: 'Listar ingredientes con stock por debajo del mínimo',
  })
  @ApiResponse({ status: 200, description: 'Lista de ingredientes en alerta.' })
  @Get('alertas')
  findAlertas() {
    return this.inventarioService.findAlertas();
  }

  @ApiOperation({ summary: 'Obtener un ingrediente por ID' })
  @ApiResponse({ status: 200, description: 'Ingrediente encontrado.' })
  @ApiResponse({ status: 404, description: 'Ingrediente no encontrado.' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.inventarioService.findOne(id);
  }

  @ApiOperation({ summary: 'Actualizar un ingrediente' })
  @ApiResponse({ status: 200, description: 'Ingrediente actualizado.' })
  @Roles(Rol.ADMIN, Rol.COCINA)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateIngredienteDto: UpdateIngredienteDto,
  ) {
    return this.inventarioService.update(id, updateIngredienteDto);
  }

  @ApiOperation({
    summary: 'Registrar una compra y recalcular el costo promedio ponderado',
  })
  @ApiResponse({
    status: 200,
    description: 'Compra registrada, stock y costo actualizados.',
  })
  @Roles(Rol.ADMIN, Rol.COCINA)
  @Post(':id/compra')
  registrarCompra(
    @Param('id', ParseIntPipe) id: number,
    @Body() registrarCompraDto: RegistrarCompraDto,
  ) {
    return this.inventarioService.registrarCompra(id, registrarCompraDto);
  }

  @ApiOperation({ summary: 'Desactivar un ingrediente' })
  @ApiResponse({ status: 200, description: 'Ingrediente desactivado.' })
  @Roles(Rol.ADMIN, Rol.COCINA)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.inventarioService.remove(id);
  }
}
