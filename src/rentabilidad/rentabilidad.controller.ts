import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RentabilidadService, MargenPlatillo } from './rentabilidad.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../usuarios/entities/usuario.entity';

@ApiTags('rentabilidad')
@ApiBearerAuth('bearer')
@ApiResponse({
  status: 401,
  description: 'No autenticado: falta el token JWT o es inválido.',
})
@ApiResponse({
  status: 403,
  description:
    'Prohibido: el rol del usuario autenticado no tiene permiso (solo ADMIN o CAJERO).',
})
@Controller('rentabilidad')
export class RentabilidadController {
  constructor(private readonly rentabilidadService: RentabilidadService) {}

  @Get('platillos')
  @Roles(Rol.ADMIN, Rol.CAJERO)
  @ApiOperation({
    summary: 'Rentabilidad por platillo',
    description:
      'Margen (precio de venta − costo real de receta) por platillo, en valor y porcentaje, ordenado de mayor a menor margen.',
  })
  @ApiResponse({ status: 200, description: 'Listado de márgenes por platillo.' })
  margenesPorPlatillo(): Promise<MargenPlatillo[]> {
    return this.rentabilidadService.margenesPorPlatillo();
  }
}
