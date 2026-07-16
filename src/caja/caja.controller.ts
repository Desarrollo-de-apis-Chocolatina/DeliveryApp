import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CajaService } from './caja.service';
import { RegistrarPagoDto } from './dto/registrar-pago.dto';
import { CierreDiarioDto } from './dto/cierre-diario.dto';
import { Pago } from './entities/pago.entity';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Rol } from '../usuarios/entities/usuario.entity';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('caja')
@ApiBearerAuth('bearer')
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
  @ApiQuery({ name: 'fecha', required: true, example: '2026-07-16' })
  @ApiResponse({ status: 200, type: CierreDiarioDto })
  cierreDiario(@Query('fecha') fecha: string): Promise<CierreDiarioDto> {
    return this.cajaService.cierreDiario(fecha);
  }
}
