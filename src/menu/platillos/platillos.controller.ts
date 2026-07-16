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
import {ApiBearerAuth, ApiOperation, ApiResponse, ApiTags} from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Rol } from '../../usuarios/entities/usuario.entity';
import { PlatillosService } from './platillos.service';
import { CreatePlatilloDto } from './dto/create-platillo.dto';
import { UpdatePlatilloDto } from './dto/update-platillo.dto';

@ApiTags('Platillos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('menu/platillos')
export class PlatillosController {
  constructor(
    private readonly platillosService: PlatillosService,
  ) {}

  @ApiOperation({
    summary: 'Crear un platillo',
    })
    @ApiResponse({
    status: 201,
    description: 'Platillo creado correctamente.',
    })
    @Roles(Rol.ADMIN, Rol.COCINA)
  @Post()
  create(@Body() createPlatilloDto: CreatePlatilloDto) {
    return this.platillosService.create(createPlatilloDto);
  }

  @ApiOperation({
    summary: 'Listar platillos',
    })
    @ApiResponse({
    status: 200,
    description: 'Lista de platillos.',
    })
  @Get()
  findAll() {
    return this.platillosService.findAll();
  }

  @ApiOperation({
    summary: 'Obtener un platillo por ID',
    })
    @ApiResponse({
    status: 200,
    description: 'Platillo encontrado.',
    })
    @ApiResponse({
    status: 404,
    description: 'Platillo no encontrado.',
    })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.platillosService.findOne(id);
  }

  @ApiOperation({
    summary: 'Actualizar un platillo',
    })
    @ApiResponse({
    status: 200,
    description: 'Platillo actualizado.',
    })
    @Roles(Rol.ADMIN, Rol.COCINA)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePlatilloDto: UpdatePlatilloDto,
  ) {
    return this.platillosService.update(id, updatePlatilloDto);
  }

  @ApiOperation({
    summary: 'Desactivar un platillo',
    })
    @ApiResponse({
    status: 200,
    description: 'Platillo desactivado.',
    })
    @Roles(Rol.ADMIN, Rol.COCINA)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.platillosService.remove(id);
  }
}