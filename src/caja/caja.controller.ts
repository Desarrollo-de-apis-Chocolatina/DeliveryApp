import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CajaService } from './caja.service';
import { RegistrarPagoDto } from './dto/registrar-pago.dto';
import { CierreDiarioDto } from './dto/cierre-diario.dto';
import { CierreDiarioQueryDto } from './dto/cierre-diario-query.dto';
import { Pago } from './entities/pago.entity';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Rol } from '../usuarios/entities/usuario.entity';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('caja')
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
@Controller('caja')
export class CajaController {
  constructor(private readonly cajaService: CajaService) {}

  @Post('pagos')
  @Roles(Rol.ADMIN, Rol.CAJERO)
  @ApiOperation({
    summary: 'Registrar el cobro de un pedido',
    description:
      'Calcula el monto desde los detalles del pedido, registra el pago (tipo de pago y propina) y marca el pedido como PAGADO.',
  })
  @ApiResponse({ status: 201, description: 'Pago registrado.', type: Pago })
  @ApiResponse({ status: 400, description: 'El pedido ya está pagado.' })
  @ApiResponse({ status: 404, description: 'El pedido no existe.' })
  registrarPago(
    @Body() dto: RegistrarPagoDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Pago> {
    return this.cajaService.registrarPago(dto, user.sub);
  }

  @Get('cierre-diario')
  @Roles(Rol.ADMIN, Rol.CAJERO)
  @ApiOperation({
    summary: 'Cierre de caja diario',
    description:
      'Total de ventas, propinas, desglose por tipo de pago y comparativa porcentual vs el día anterior.',
  })
  @ApiResponse({ status: 200, type: CierreDiarioDto })
  @ApiResponse({
    status: 400,
    description: 'Fecha con formato inválido, futura o no existente en el calendario.',
  })
  cierreDiario(@Query() query: CierreDiarioQueryDto): Promise<CierreDiarioDto> {
    return this.cajaService.cierreDiario(query.fecha);
  }
}
