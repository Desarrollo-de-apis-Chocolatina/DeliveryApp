import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PedidosDeliveryService } from './pedidos-delivery.service';
import {
  PedidoDelivery,
  EstadoPedidoDelivery,
} from './entities/pedido-delivery.entity';
import { Repartidor } from '../repartidores/entities/repartidor.entity';
import { InventarioService } from '../inventario/inventario.service';

describe('PedidosDeliveryService', () => {
  let service: PedidosDeliveryService;
  let pedidoRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    count: jest.Mock;
    save: jest.Mock;
  };
  let repartidorRepository: { findOne: jest.Mock };
  let manager: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let inventarioService: { descontarStockDePlatillo: jest.Mock };

  beforeEach(async () => {
    pedidoRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };
    repartidorRepository = { findOne: jest.fn() };
    manager = {
      findOne: jest.fn(),
      create: jest.fn((_entity: unknown, data: Record<string, unknown>) => ({
        ...data,
      })),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };
    dataSource = {
      transaction: jest.fn((cb: (m: EntityManager) => unknown) =>
        cb(manager as unknown as EntityManager),
      ),
    };
    inventarioService = { descontarStockDePlatillo: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PedidosDeliveryService,
        {
          provide: getRepositoryToken(PedidoDelivery),
          useValue: pedidoRepository,
        },
        {
          provide: getRepositoryToken(Repartidor),
          useValue: repartidorRepository,
        },
        { provide: DataSource, useValue: dataSource },
        { provide: InventarioService, useValue: inventarioService },
      ],
    }).compile();

    service = module.get<PedidosDeliveryService>(PedidosDeliveryService);
  });

  describe('create', () => {
    it('crea el pedido con dirección y detalles usando el precio del platillo', async () => {
      const platillo = { id: 5, disponible: true, precio: 20 };
      manager.findOne.mockResolvedValueOnce(platillo);

      const resultado = await service.create({
        direccion: 'Calle 123',
        detalles: [{ platilloId: 5, cantidad: 3 }],
      });

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(resultado.direccion).toBe('Calle 123');
      expect(resultado.detalles).toHaveLength(1);
      expect(resultado.detalles[0]).toMatchObject({
        cantidad: 3,
        precioUnitario: 20,
        platillo,
      });
      expect(manager.save).toHaveBeenCalledWith(resultado);
    });

    it('lanza BadRequestException si un platillo no está disponible', async () => {
      manager.findOne.mockResolvedValueOnce({
        id: 5,
        disponible: false,
        precio: 20,
      });

      await expect(
        service.create({
          direccion: 'Calle 123',
          detalles: [{ platilloId: 5, cantidad: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(manager.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('delega en el repositorio', async () => {
      const pedidos = [{ id: 1 }];
      pedidoRepository.find.mockResolvedValue(pedidos);

      const resultado = await service.findAll();

      expect(resultado).toBe(pedidos);
      expect(pedidoRepository.find).toHaveBeenCalled();
    });
  });

  describe('updateEstado (a LISTO)', () => {
    it('descuenta stock por cada detalle y cambia el estado a LISTO', async () => {
      const pedido = {
        id: 1,
        estado: EstadoPedidoDelivery.EN_COCINA,
        detalles: [{ platillo: { id: 5 }, cantidad: 4 }],
      };
      manager.findOne.mockResolvedValueOnce(pedido);

      const resultado = await service.updateEstado(
        1,
        EstadoPedidoDelivery.LISTO,
      );

      expect(inventarioService.descontarStockDePlatillo).toHaveBeenCalledWith(
        5,
        4,
        manager,
      );
      expect(resultado.estado).toBe(EstadoPedidoDelivery.LISTO);
      expect(manager.save).toHaveBeenCalledWith(pedido);
    });

    it('propaga BadRequestException por inventario insuficiente y NO cambia el estado', async () => {
      const pedido = {
        id: 1,
        estado: EstadoPedidoDelivery.EN_COCINA,
        detalles: [{ platillo: { id: 5 }, cantidad: 4 }],
      };
      manager.findOne.mockResolvedValueOnce(pedido);
      inventarioService.descontarStockDePlatillo.mockRejectedValueOnce(
        new BadRequestException('Stock insuficiente'),
      );

      await expect(
        service.updateEstado(1, EstadoPedidoDelivery.LISTO),
      ).rejects.toThrow(BadRequestException);

      expect(pedido.estado).toBe(EstadoPedidoDelivery.EN_COCINA);
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException si el pedido no está EN_COCINA', async () => {
      manager.findOne.mockResolvedValueOnce({
        id: 1,
        estado: EstadoPedidoDelivery.TOMADO,
        detalles: [],
      });

      await expect(
        service.updateEstado(1, EstadoPedidoDelivery.LISTO),
      ).rejects.toThrow(BadRequestException);
      expect(inventarioService.descontarStockDePlatillo).not.toHaveBeenCalled();
    });
  });

  describe('updateEstado (otros estados)', () => {
    it('cambia el estado sin transacción ni descuento de stock', async () => {
      const pedido = { id: 1, estado: EstadoPedidoDelivery.EN_CAMINO };
      pedidoRepository.findOne.mockResolvedValueOnce(pedido);

      const resultado = await service.updateEstado(
        1,
        EstadoPedidoDelivery.ENTREGADO,
      );

      expect(resultado.estado).toBe(EstadoPedidoDelivery.ENTREGADO);
      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(pedidoRepository.save).toHaveBeenCalledWith(pedido);
    });

    it('lanza NotFoundException si el pedido no existe', async () => {
      pedidoRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.updateEstado(99, EstadoPedidoDelivery.ENTREGADO),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException al intentar marcar PAGADO directamente (debe hacerse vía POST /caja/pagos)', async () => {
      await expect(
        service.updateEstado(1, EstadoPedidoDelivery.PAGADO),
      ).rejects.toThrow(BadRequestException);
      expect(pedidoRepository.findOne).not.toHaveBeenCalled();
      expect(pedidoRepository.save).not.toHaveBeenCalled();
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('assignRepartidor', () => {
    it('asigna el repartidor y pasa el pedido a EN_CAMINO (caso feliz)', async () => {
      const repartidor = { id: 2, disponible: true };
      const pedido = { id: 1, estado: EstadoPedidoDelivery.LISTO };
      repartidorRepository.findOne.mockResolvedValueOnce(repartidor);
      pedidoRepository.count.mockResolvedValueOnce(2);
      pedidoRepository.findOne.mockResolvedValueOnce(pedido);

      const resultado = await service.assignRepartidor(1, 2);

      expect(resultado.estado).toBe(EstadoPedidoDelivery.EN_CAMINO);
      expect(resultado.repartidor).toBe(repartidor);
      expect(pedidoRepository.count).toHaveBeenCalledWith({
        where: {
          repartidor: { id: 2 },
          estado: EstadoPedidoDelivery.EN_CAMINO,
        },
      });
      expect(pedidoRepository.save).toHaveBeenCalledWith(pedido);
    });

    it('lanza BadRequestException si el repartidor no existe o no está disponible', async () => {
      repartidorRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.assignRepartidor(1, 2)).rejects.toThrow(
        BadRequestException,
      );
      expect(pedidoRepository.count).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException al 4º pedido activo (tope 3, count devuelve 3)', async () => {
      repartidorRepository.findOne.mockResolvedValueOnce({
        id: 2,
        disponible: true,
      });
      pedidoRepository.count.mockResolvedValueOnce(3);

      await expect(service.assignRepartidor(1, 2)).rejects.toThrow(
        BadRequestException,
      );
      expect(pedidoRepository.save).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si el pedido no existe', async () => {
      repartidorRepository.findOne.mockResolvedValueOnce({
        id: 2,
        disponible: true,
      });
      pedidoRepository.count.mockResolvedValueOnce(0);
      pedidoRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.assignRepartidor(1, 2)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza BadRequestException si el pedido no está LISTO', async () => {
      repartidorRepository.findOne.mockResolvedValueOnce({
        id: 2,
        disponible: true,
      });
      pedidoRepository.count.mockResolvedValueOnce(0);
      pedidoRepository.findOne.mockResolvedValueOnce({
        id: 1,
        estado: EstadoPedidoDelivery.TOMADO,
      });

      await expect(service.assignRepartidor(1, 2)).rejects.toThrow(
        BadRequestException,
      );
      expect(pedidoRepository.save).not.toHaveBeenCalled();
    });
  });
});
