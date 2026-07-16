import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { RepartidoresService } from './repartidores.service';
import { CreateRepartidorDto } from './dto/create-repartidor.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
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

  @Post()
  @Roles(Rol.ADMIN)
  create(@Body() createRepartidorDto: CreateRepartidorDto) {
    return this.repartidoresService.create(createRepartidorDto);
  }

  @Get()
  @Roles(Rol.ADMIN)
  findAll() {
    return this.repartidoresService.findAll();
  }
}
