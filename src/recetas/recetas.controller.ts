import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { RecetasService } from './recetas.service';
import { CreateRecetaDto } from './dto/create-receta.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../usuarios/entities/usuario.entity';

@ApiTags('Recetas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('recetas')
export class RecetasController {
  constructor(private readonly recetasService: RecetasService) {}

  @ApiOperation({
    summary: 'Crear o reemplazar la receta de un platillo',
  })
  @ApiResponse({
    status: 201,
    description: 'Receta guardada correctamente.',
  })
  @Roles(Rol.ADMIN, Rol.COCINA)
  @Post('platillo/:platilloId')
  createOrReplace(
    @Param('platilloId', ParseIntPipe)
    platilloId: number,

    @Body()
    createRecetaDto: CreateRecetaDto,
  ) {
    return this.recetasService.createOrReplace(platilloId, createRecetaDto);
  }

  @ApiOperation({
    summary: 'Obtener la receta de un platillo',
  })
  @ApiResponse({
    status: 200,
    description: 'Receta encontrada.',
  })
  @ApiResponse({
    status: 404,
    description: 'Platillo no encontrado.',
  })
  @Get('platillo/:platilloId')
  findByPlatillo(
    @Param('platilloId', ParseIntPipe)
    platilloId: number,
  ) {
    return this.recetasService.findByPlatillo(platilloId);
  }

  @ApiOperation({
    summary: 'Eliminar la receta de un platillo',
  })
  @ApiResponse({
    status: 200,
    description: 'Receta eliminada correctamente.',
  })
  @Roles(Rol.ADMIN, Rol.COCINA)
  @Delete('platillo/:platilloId')
  removeByPlatillo(
    @Param('platilloId', ParseIntPipe)
    platilloId: number,
  ) {
    return this.recetasService.removeByPlatillo(platilloId);
  }
}
