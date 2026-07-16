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
import { CategoriasService } from './categorias.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Rol } from '../../usuarios/entities/usuario.entity';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Categorías')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('menu/categorias')
export class CategoriasController {
  constructor(private readonly categoriasService: CategoriasService) {}

  @Roles(Rol.ADMIN, Rol.COCINA)
  @ApiOperation({
    summary: 'Crear una categoría',
  })
  @ApiResponse({
    status: 201,
    description: 'Categoría creada correctamente.',
  })
  @Post()
  create(@Body() createCategoriaDto: CreateCategoriaDto) {
    return this.categoriasService.create(createCategoriaDto);
  }

  @ApiOperation({
    summary: 'Listar categorías',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de categorías.',
  })
  @Get()
  findAll() {
    return this.categoriasService.findAll();
  }

  @ApiOperation({
    summary: 'Obtener una categoría por ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Categoría encontrada.',
  })
  @ApiResponse({
    status: 404,
    description: 'Categoría no encontrada.',
  })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoriasService.findOne(id);
  }

  @Roles(Rol.ADMIN, Rol.COCINA)
  @ApiOperation({
    summary: 'Actualizar una categoría',
  })
  @ApiResponse({
    status: 200,
    description: 'Categoría actualizada.',
  })
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoriaDto: UpdateCategoriaDto,
  ) {
    return this.categoriasService.update(id, updateCategoriaDto);
  }

  @Roles(Rol.ADMIN, Rol.COCINA)
  @ApiOperation({
    summary: 'Desactivar una categoría',
  })
  @ApiResponse({
    status: 200,
    description: 'Categoría desactivada.',
  })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoriasService.remove(id);
  }
}
