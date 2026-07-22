import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PedidosMesaService } from './pedidos-mesa.service';
import { PedidoMesa, EstadoPedidoMesa } from './entities/pedido-mesa.entity';
import { InventarioService } from '../inventario/inventario.service';
import { DetalleDto } from './dto/create-pedido-mesa.dto';

describe('PedidosMesaService', () => {
  let service: PedidosMesaService;
  let pedidoRepository: { find: jest.Mock; findOne: jest.Mock; save: jest.Mock };
  let manager: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let inventarioService: { descontarStockDePlatillo: jest.Mock };

  beforeEach(async () => {
    pedidoRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };
    manager = {
      findOne: jest.fn(),
      // create devuelve una copia con los datos provistos (2do arg del EntityManager.create)
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
        PedidosMesaService,
        { provide: getRepositoryToken(PedidoMesa), useValue: pedidoRepository },
        { provide: DataSource, useValue: dataSource },
        { provide: InventarioService, useValue: inventarioService },
      ],
    }).compile();

    service = module.get<PedidosMesaService>(PedidosMesaService);
  });

  describe('create', () => {
    it('crea el pedido con sus detalles usando el precio del platillo', async () => {
      const mesero = { id: 'mesero-1' };
      const platillo = { id: 5, disponible: true, precio: 12.5 };
      manager.findOne
        .mockResolvedValueOnce(mesero) // mesero
        .mockResolvedValueOnce(platillo); // platillo

      const resultado = await service.create(
        { numeroMesa: 3, detalles: [{ platilloId: 5, cantidad: 2 }] },
        'mesero-1',
      );

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(resultado.numeroMesa).toBe(3);
      expect(resultado.detalles).toHaveLength(1);
      expect(resultado.detalles[0]).toMatchObject({
        cantidad: 2,
        precioUnitario: 12.5,
        platillo,
      });
      expect(manager.save).toHaveBeenCalledWith(resultado);
    });

    it('lanza NotFoundException si el mesero no existe', async () => {
      manager.findOne.mockResolvedValueOnce(null);

      await expect(
        service.create(
          { numeroMesa: 1, detalles: [{ platilloId: 5, cantidad: 1 }] },
          'inexistente',
        ),
      ).rejects.toThrow(NotFoundException);
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException si un platillo no existe o no está disponible', async () => {
      manager.findOne
        .mockResolvedValueOnce({ id: 'mesero-1' }) // mesero
        .mockResolvedValueOnce({ id: 5, disponible: false, precio: 10 }); // platillo no disponible

      await expect(
        service.create(
          { numeroMesa: 1, detalles: [{ platilloId: 5, cantidad: 1 }] },
          'mesero-1',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(manager.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('delega en el repositorio', async () => {
      const pedidos = [{ id: 1 }, { id: 2 }];
      pedidoRepository.find.mockResolvedValue(pedidos);

      const resultado = await service.findAll();

      expect(resultado).toBe(pedidos);
      expect(pedidoRepository.find).toHaveBeenCalled();
    });
  });

  describe('updateEstado (a LISTO)', () => {
    it('descuenta stock por cada detalle y cambia el estado a LISTO (caso feliz)', async () => {
      const pedido = {
        id: 1,
        estado: EstadoPedidoMesa.EN_COCINA,
        detalles: [
          { platillo: { id: 5 }, cantidad: 2 },
          { platillo: { id: 8 }, cantidad: 1 },
        ],
      };
      manager.findOne.mockResolvedValueOnce(pedido);

      const resultado = await service.updateEstado(1, EstadoPedidoMesa.LISTO);

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(inventarioService.descontarStockDePlatillo).toHaveBeenCalledTimes(2);
      expect(inventarioService.descontarStockDePlatillo).toHaveBeenNthCalledWith(
        1,
        5,
        2,
        manager,
      );
      expect(inventarioService.descontarStockDePlatillo).toHaveBeenNthCalledWith(
        2,
        8,
        1,
        manager,
      );
      expect(resultado.estado).toBe(EstadoPedidoMesa.LISTO);
      expect(manager.save).toHaveBeenCalledWith(pedido);
    });

    it('propaga BadRequestException si el inventario es insuficiente y NO cambia el estado', async () => {
      const pedido = {
        id: 1,
        estado: EstadoPedidoMesa.EN_COCINA,
        detalles: [{ platillo: { id: 5 }, cantidad: 2 }],
      };
      manager.findOne.mockResolvedValueOnce(pedido);
      inventarioService.descontarStockDePlatillo.mockRejectedValueOnce(
        new BadRequestException('Stock insuficiente'),
      );

      await expect(
        service.updateEstado(1, EstadoPedidoMesa.LISTO),
      ).rejects.toThrow(BadRequestException);

      expect(pedido.estado).toBe(EstadoPedidoMesa.EN_COCINA);
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException si el pedido no está EN_COCINA', async () => {
      manager.findOne.mockResolvedValueOnce({
        id: 1,
        estado: EstadoPedidoMesa.TOMADO,
        detalles: [],
      });

      await expect(
        service.updateEstado(1, EstadoPedidoMesa.LISTO),
      ).rejects.toThrow(BadRequestException);
      expect(inventarioService.descontarStockDePlatillo).not.toHaveBeenCalled();
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si el pedido no existe', async () => {
      manager.findOne.mockResolvedValueOnce(null);

      await expect(
        service.updateEstado(99, EstadoPedidoMesa.LISTO),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('agregarDetalles', () => {
    const detalles: DetalleDto[] = [{ platilloId: 9, cantidad: 2 }];

    it('agrega detalles a un pedido TOMADO existente de la mesa (mismo pedidoId)', async () => {
      const pedidoExistente = { id: 4, numeroMesa: 5, estado: EstadoPedidoMesa.TOMADO, detalles: [] };
      const platillo = { id: 9, disponible: true, precio: 7.5 };
      manager.findOne
        .mockResolvedValueOnce(pedidoExistente) // busca pedido abierto
        .mockResolvedValueOnce(platillo); // busca platillo

      const resultado = await service.agregarDetalles(5, detalles);

      expect(resultado.id).toBe(4);
      expect(resultado.detalles).toHaveLength(1);
      expect(resultado.detalles[0]).toMatchObject({ cantidad: 2, precioUnitario: 7.5 });
      expect(manager.save).toHaveBeenCalledWith(pedidoExistente);
    });

    it('agrega detalles a un pedido EN_COCINA existente de la mesa', async () => {
      const pedidoExistente = { id: 4, numeroMesa: 5, estado: EstadoPedidoMesa.EN_COCINA, detalles: [] };
      const platillo = { id: 9, disponible: true, precio: 7.5 };
      manager.findOne
        .mockResolvedValueOnce(pedidoExistente)
        .mockResolvedValueOnce(platillo);

      const resultado = await service.agregarDetalles(5, detalles);

      expect(resultado.estado).toBe(EstadoPedidoMesa.EN_COCINA);
      expect(manager.save).toHaveBeenCalledWith(pedidoExistente);
    });

    it('lanza NotFoundException si no hay pedido abierto para esa mesa', async () => {
      manager.findOne.mockResolvedValueOnce(null);

      await expect(service.agregarDetalles(5, detalles)).rejects.toThrow(
        NotFoundException,
      );
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException si un platillo no existe o no está disponible', async () => {
      const pedidoExistente = { id: 4, numeroMesa: 5, estado: EstadoPedidoMesa.TOMADO, detalles: [] };
      manager.findOne
        .mockResolvedValueOnce(pedidoExistente)
        .mockResolvedValueOnce({ id: 9, disponible: false, precio: 7.5 });

      await expect(service.agregarDetalles(5, detalles)).rejects.toThrow(
        BadRequestException,
      );
      expect(manager.save).not.toHaveBeenCalled();
    });
  });

  describe('updateEstado (otros estados)', () => {
    it('cambia el estado de LISTO a ENTREGADO correctamente', async () => {
      const pedido = { id: 1, estado: EstadoPedidoMesa.LISTO };
      pedidoRepository.findOne.mockResolvedValueOnce(pedido);

      const resultado = await service.updateEstado(
        1,
        EstadoPedidoMesa.ENTREGADO,
      );

      expect(resultado.estado).toBe(EstadoPedidoMesa.ENTREGADO);
      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(inventarioService.descontarStockDePlatillo).not.toHaveBeenCalled();
      expect(pedidoRepository.save).toHaveBeenCalledWith(pedido);
    });

    it('lanza BadRequestException si se intenta un salto de estado no permitido (ej. TOMADO a ENTREGADO)', async () => {
      const pedido = { id: 1, estado: EstadoPedidoMesa.TOMADO };
      pedidoRepository.findOne.mockResolvedValueOnce(pedido);

      await expect(
        service.updateEstado(1, EstadoPedidoMesa.ENTREGADO),
      ).rejects.toThrow(BadRequestException);
      expect(pedidoRepository.save).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException si se intenta un retroceso de estado (ej. ENTREGADO a EN_COCINA)', async () => {
      const pedido = { id: 1, estado: EstadoPedidoMesa.ENTREGADO };
      pedidoRepository.findOne.mockResolvedValueOnce(pedido);

      await expect(
        service.updateEstado(1, EstadoPedidoMesa.EN_COCINA),
      ).rejects.toThrow(BadRequestException);
      expect(pedidoRepository.save).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si el pedido no existe', async () => {
      pedidoRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.updateEstado(99, EstadoPedidoMesa.ENTREGADO),
      ).rejects.toThrow(NotFoundException);
      expect(pedidoRepository.save).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException al intentar marcar PAGADO directamente (debe hacerse vía POST /caja/pagos)', async () => {
      await expect(
        service.updateEstado(1, EstadoPedidoMesa.PAGADO),
      ).rejects.toThrow(BadRequestException);
      expect(pedidoRepository.findOne).not.toHaveBeenCalled();
      expect(pedidoRepository.save).not.toHaveBeenCalled();
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });
});
