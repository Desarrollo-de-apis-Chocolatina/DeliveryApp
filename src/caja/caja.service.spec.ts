import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CajaService } from './caja.service';
import { Pago, CanalPedido, TipoPago } from './entities/pago.entity';
import { PedidoMesa, EstadoPedidoMesa } from '../pedidos-mesa/entities/pedido-mesa.entity';
import {
  PedidoDelivery,
  EstadoPedidoDelivery,
} from '../pedidos-delivery/entities/pedido-delivery.entity';

describe('CajaService', () => {
  let service: CajaService;
  let manager: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let pagoRepository: { find: jest.Mock };

  beforeEach(async () => {
    manager = {
      findOne: jest.fn(),
      create: jest.fn((_entity: unknown, data: Record<string, unknown>) => ({
        ...data,
      })),
      save: jest.fn((entity: unknown) => Promise.resolve(entity)),
    };
    dataSource = {
      transaction: jest.fn((cb: (m: typeof manager) => unknown) => cb(manager)),
    };
    pagoRepository = { find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CajaService,
        { provide: getRepositoryToken(Pago), useValue: pagoRepository },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<CajaService>(CajaService);
  });

  describe('registrarPago', () => {
    it('calcula el monto desde los detalles, crea el pago y marca el pedido de mesa como PAGADO', async () => {
      const pedido = {
        id: 7,
        estado: EstadoPedidoMesa.ENTREGADO,
        // precioUnitario llega como string (decimal sin transformer)
        detalles: [
          { precioUnitario: '10.00', cantidad: 2 },
          { precioUnitario: '5.50', cantidad: 1 },
        ],
      };
      manager.findOne.mockResolvedValue(pedido);

      const pago = await service.registrarPago(
        {
          canal: CanalPedido.MESA,
          pedidoId: 7,
          tipoPago: TipoPago.TARJETA,
          propina: 3,
        },
        'cajero-uuid-1',
      );

      expect(manager.findOne).toHaveBeenCalledWith(PedidoMesa, {
        where: { id: 7 },
      });
      expect(pedido.estado).toBe(EstadoPedidoMesa.PAGADO);
      expect(pago.monto).toBe(25.5);
      expect(pago.propina).toBe(3);
      expect(pago.tipoPago).toBe(TipoPago.TARJETA);
      expect(pago.canal).toBe(CanalPedido.MESA);
      expect(pago.pedidoMesaId).toBe(7);
      expect(pago.pedidoDeliveryId).toBeNull();
      expect(pago.cajeroId).toBe('cajero-uuid-1');
    });

    it('usa propina 0 por defecto y resuelve el canal DELIVERY', async () => {
      const pedido = {
        id: 3,
        estado: EstadoPedidoDelivery.ENTREGADO,
        detalles: [{ precioUnitario: '8.00', cantidad: 1 }],
      };
      manager.findOne.mockResolvedValue(pedido);

      const pago = await service.registrarPago(
        { canal: CanalPedido.DELIVERY, pedidoId: 3, tipoPago: TipoPago.EFECTIVO },
        'cajero-uuid-2',
      );

      expect(manager.findOne).toHaveBeenCalledWith(PedidoDelivery, {
        where: { id: 3 },
      });
      expect(pedido.estado).toBe(EstadoPedidoDelivery.PAGADO);
      expect(pago.monto).toBe(8);
      expect(pago.propina).toBe(0);
      expect(pago.pedidoDeliveryId).toBe(3);
      expect(pago.pedidoMesaId).toBeNull();
    });

    it('lanza NotFoundException si el pedido no existe', async () => {
      manager.findOne.mockResolvedValue(null);

      await expect(
        service.registrarPago(
          { canal: CanalPedido.MESA, pedidoId: 99, tipoPago: TipoPago.EFECTIVO },
          'cajero-uuid-3',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException si el pedido ya está PAGADO', async () => {
      manager.findOne.mockResolvedValue({
        id: 7,
        estado: EstadoPedidoMesa.PAGADO,
        detalles: [],
      });

      await expect(
        service.registrarPago(
          { canal: CanalPedido.MESA, pedidoId: 7, tipoPago: TipoPago.EFECTIVO },
          'cajero-uuid-4',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cierreDiario', () => {
    it('agrega ventas, propinas, desglose por tipo de pago y variación vs día anterior', async () => {
      const pagosHoy = [
        { monto: 10, propina: 1, tipoPago: TipoPago.EFECTIVO },
        { monto: 20, propina: 2, tipoPago: TipoPago.TARJETA },
        { monto: 5, propina: 0, tipoPago: TipoPago.TRANSFERENCIA },
      ];
      const pagosAyer = [{ monto: 25, propina: 0, tipoPago: TipoPago.EFECTIVO }];
      // find se llama primero para hoy y luego para ayer
      pagoRepository.find
        .mockResolvedValueOnce(pagosHoy)
        .mockResolvedValueOnce(pagosAyer);

      const reporte = await service.cierreDiario('2026-07-16');

      expect(reporte.fecha).toBe('2026-07-16');
      expect(reporte.ventasTotales).toBe(35);
      expect(reporte.propinasTotales).toBe(3);
      expect(reporte.porTipoPago).toEqual({
        EFECTIVO: 10,
        TARJETA: 20,
        TRANSFERENCIA: 5,
      });
      expect(reporte.ventasDiaAnterior).toBe(25);
      // ((35 - 25) / 25) * 100 = 40
      expect(reporte.variacionPct).toBe(40);
    });

    it('devuelve variacionPct null cuando no hubo ventas el día anterior', async () => {
      pagoRepository.find
        .mockResolvedValueOnce([{ monto: 10, propina: 0, tipoPago: TipoPago.EFECTIVO }])
        .mockResolvedValueOnce([]);

      const reporte = await service.cierreDiario('2026-07-16');

      expect(reporte.ventasDiaAnterior).toBe(0);
      expect(reporte.variacionPct).toBeNull();
    });
  });
});
