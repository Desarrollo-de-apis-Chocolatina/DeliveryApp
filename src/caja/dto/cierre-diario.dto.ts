import { ApiProperty } from '@nestjs/swagger';

/**
 * Desglose de ventas por tipo de pago dentro de un cierre diario.
 */
export class DesglosePorTipoPagoDto {
  @ApiProperty({ example: 120.5 })
  EFECTIVO: number;

  @ApiProperty({ example: 340.0 })
  TARJETA: number;

  @ApiProperty({ example: 75.25 })
  TRANSFERENCIA: number;
}

/**
 * Reporte de cierre de caja de un día: ventas, propinas, desglose por tipo de
 * pago y comparativa contra el día anterior.
 */
export class CierreDiarioDto {
  @ApiProperty({ example: '2026-07-16' })
  fecha: string;

  @ApiProperty({ example: 535.75, description: 'Suma de montos de los pagos del día.' })
  ventasTotales: number;

  @ApiProperty({ example: 42.0, description: 'Suma de propinas del día.' })
  propinasTotales: number;

  @ApiProperty({ type: DesglosePorTipoPagoDto })
  porTipoPago: DesglosePorTipoPagoDto;

  @ApiProperty({ example: 480.0, description: 'Ventas totales del día anterior.' })
  ventasDiaAnterior: number;

  @ApiProperty({
    example: 11.61,
    nullable: true,
    description:
      'Variación porcentual de ventas vs el día anterior. null si el día anterior no tuvo ventas.',
  })
  variacionPct: number | null;
}
