import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InventarioService } from './inventario.service';
import { Ingrediente, UnidadMedida } from './entities/ingrediente.entity';
import { RecetasService } from '../recetas/recetas.service';
import { PlatillosService } from '../menu/platillos/platillos.service';

describe('InventarioService', () => {
  let service: InventarioService;
  let repository: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let recetasService: { findByPlatillo: jest.Mock };
  let platillosService: { marcarNoDisponiblePorIngrediente: jest.Mock };

  beforeEach(async () => {
    repository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(
        (dto: Partial<Ingrediente>): Partial<Ingrediente> => ({ ...dto }),
      ),
      save: jest.fn(
        (entity: Ingrediente): Promise<Ingrediente> => Promise.resolve(entity),
      ),
    };
    recetasService = { findByPlatillo: jest.fn() };
    platillosService = { marcarNoDisponiblePorIngrediente: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventarioService,
        { provide: getRepositoryToken(Ingrediente), useValue: repository },
        { provide: RecetasService, useValue: recetasService },
        { provide: PlatillosService, useValue: platillosService },
      ],
    }).compile();

    service = module.get<InventarioService>(InventarioService);
  });

  describe('create', () => {
    it('crea un ingrediente con stock y costo en 0 si no se envían', async () => {
      repository.findOne.mockResolvedValue(null);

      const resultado = await service.create({
        nombre: 'Harina',
        unidadMedida: UnidadMedida.KG,
        stockMinimo: 5,
      });

      expect(resultado.stock).toBe(0);
      expect(resultado.costoUnitarioPromedio).toBe(0);
      expect(repository.save).toHaveBeenCalled();
    });

    it('lanza ConflictException si ya existe un ingrediente con ese nombre', async () => {
      repository.findOne.mockResolvedValue({ id: 1, nombre: 'Harina' });

      await expect(
        service.create({
          nombre: 'Harina',
          unidadMedida: UnidadMedida.KG,
          stockMinimo: 5,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('devuelve solo ingredientes activos ordenados por nombre', async () => {
      repository.find.mockResolvedValue([]);

      await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({
        where: { activo: true },
        order: { nombre: 'ASC' },
      });
    });
  });

  describe('findOne', () => {
    it('lanza NotFoundException si el ingrediente no existe', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });

    it('devuelve el ingrediente si existe', async () => {
      repository.findOne.mockResolvedValue({ id: 1, nombre: 'Harina' });

      const resultado = await service.findOne(1);

      expect(resultado).toEqual({ id: 1, nombre: 'Harina' });
    });
  });

  describe('update', () => {
    it('actualiza solo nombre, unidadMedida y stockMinimo', async () => {
      repository.findOne
        .mockResolvedValueOnce({
          id: 1,
          nombre: 'Harina',
          unidadMedida: UnidadMedida.KG,
          stockMinimo: 5,
          stock: 10,
          costoUnitarioPromedio: 2,
        })
        .mockResolvedValueOnce(null);

      const resultado = await service.update(1, { stockMinimo: 8 });

      expect(resultado.stockMinimo).toBe(8);
      expect(resultado.stock).toBe(10);
    });

    it('lanza ConflictException si el nuevo nombre ya existe en otro ingrediente', async () => {
      repository.findOne
        .mockResolvedValueOnce({ id: 1, nombre: 'Harina' })
        .mockResolvedValueOnce({ id: 2, nombre: 'Sal' });

      await expect(service.update(1, { nombre: 'Sal' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('desactiva el ingrediente (soft delete)', async () => {
      repository.findOne.mockResolvedValue({
        id: 1,
        nombre: 'Harina',
        activo: true,
      });

      const resultado = await service.remove(1);

      expect(resultado.activo).toBe(false);
    });
  });

  describe('registrarCompra', () => {
    it('recalcula el costo promedio ponderado y suma el stock', async () => {
      repository.findOne.mockResolvedValue({
        id: 1,
        nombre: 'Harina',
        stock: 10,
        costoUnitarioPromedio: 2,
        stockMinimo: 5,
      });

      // (10*2 + 10*4) / 20 = 3
      const resultado = await service.registrarCompra(1, {
        cantidad: 10,
        costoUnitario: 4,
      });

      expect(resultado.costoUnitarioPromedio).toBe(3);
      expect(resultado.stock).toBe(20);
    });

    it('usa el costo de la compra como promedio cuando el stock actual es 0', async () => {
      repository.findOne.mockResolvedValue({
        id: 1,
        nombre: 'Harina',
        stock: 0,
        costoUnitarioPromedio: 0,
        stockMinimo: 5,
      });

      const resultado = await service.registrarCompra(1, {
        cantidad: 5,
        costoUnitario: 3,
      });

      expect(resultado.costoUnitarioPromedio).toBe(3);
      expect(resultado.stock).toBe(5);
    });
  });

  describe('findAlertas', () => {
    it('devuelve solo los ingredientes con stock por debajo o igual al mínimo', async () => {
      repository.find.mockResolvedValue([
        { id: 1, nombre: 'Harina', stock: 2, stockMinimo: 5 },
        { id: 2, nombre: 'Sal', stock: 10, stockMinimo: 5 },
        { id: 3, nombre: 'Azucar', stock: 5, stockMinimo: 5 },
      ]);

      const resultado = await service.findAlertas();

      expect(resultado.map((i) => i.nombre)).toEqual(['Harina', 'Azucar']);
    });
  });

  describe('descontarStockDePlatillo', () => {
    it('descuenta el stock de cada ingrediente de la receta', async () => {
      recetasService.findByPlatillo.mockResolvedValue([
        { ingredienteId: 1, cantidadPorPorcion: 0.2 },
      ]);
      repository.findOne.mockResolvedValue({
        id: 1,
        nombre: 'Carne',
        stock: 5,
        stockMinimo: 1,
      });

      await service.descontarStockDePlatillo(10, 3);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, stock: 5 - 0.2 * 3 }),
      );
    });

    it('lanza BadRequestException si algún ingrediente no tiene stock suficiente y no guarda nada', async () => {
      recetasService.findByPlatillo.mockResolvedValue([
        { ingredienteId: 1, cantidadPorPorcion: 10 },
      ]);
      repository.findOne.mockResolvedValue({
        id: 1,
        nombre: 'Carne',
        stock: 5,
        stockMinimo: 1,
      });

      await expect(service.descontarStockDePlatillo(10, 3)).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('no descuenta ningún ingrediente si uno de la lista falla (todo o nada)', async () => {
      recetasService.findByPlatillo.mockResolvedValue([
        { ingredienteId: 1, cantidadPorPorcion: 1 },
        { ingredienteId: 2, cantidadPorPorcion: 100 },
      ]);
      repository.findOne
        .mockResolvedValueOnce({
          id: 1,
          nombre: 'Carne',
          stock: 5,
          stockMinimo: 1,
        })
        .mockResolvedValueOnce({
          id: 2,
          nombre: 'Sal',
          stock: 1,
          stockMinimo: 1,
        });

      await expect(service.descontarStockDePlatillo(10, 1)).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('marca el platillo no disponible cuando un ingrediente CLAVE llega a stock 0', async () => {
      recetasService.findByPlatillo.mockResolvedValue([
        { ingredienteId: 1, cantidadPorPorcion: 5, esIngredienteClave: true },
      ]);
      repository.findOne.mockResolvedValue({
        id: 1,
        nombre: 'Carne',
        stock: 5,
        stockMinimo: 1,
      });

      await service.descontarStockDePlatillo(10, 1);

      expect(
        platillosService.marcarNoDisponiblePorIngrediente,
      ).toHaveBeenCalledWith(1);
    });

    it('NO marca el platillo no disponible si el ingrediente en 0 no es clave', async () => {
      recetasService.findByPlatillo.mockResolvedValue([
        { ingredienteId: 1, cantidadPorPorcion: 5, esIngredienteClave: false },
      ]);
      repository.findOne.mockResolvedValue({
        id: 1,
        nombre: 'Carne',
        stock: 5,
        stockMinimo: 1,
      });

      await service.descontarStockDePlatillo(10, 1);

      expect(
        platillosService.marcarNoDisponiblePorIngrediente,
      ).not.toHaveBeenCalled();
    });

    it('no marca el platillo no disponible si el stock queda por encima de 0', async () => {
      recetasService.findByPlatillo.mockResolvedValue([
        { ingredienteId: 1, cantidadPorPorcion: 1, esIngredienteClave: true },
      ]);
      repository.findOne.mockResolvedValue({
        id: 1,
        nombre: 'Carne',
        stock: 5,
        stockMinimo: 1,
      });

      await service.descontarStockDePlatillo(10, 1);

      expect(
        platillosService.marcarNoDisponiblePorIngrediente,
      ).not.toHaveBeenCalled();
    });

    it('usa un lock pesimista al leer el ingrediente cuando se provee un manager transaccional', async () => {
      recetasService.findByPlatillo.mockResolvedValue([
        { ingredienteId: 1, cantidadPorPorcion: 1, esIngredienteClave: false },
      ]);
      const managerRepo = {
        findOne: jest.fn().mockResolvedValue({
          id: 1,
          nombre: 'Carne',
          stock: 5,
          stockMinimo: 1,
        }),
        save: jest.fn((entity: Ingrediente) => Promise.resolve(entity)),
      };
      const manager = {
        getRepository: jest.fn().mockReturnValue(managerRepo),
      } as unknown as EntityManager;

      await service.descontarStockDePlatillo(10, 1, manager);

      expect(managerRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
      );
      expect(repository.findOne).not.toHaveBeenCalled();
    });

    it('NO usa lock pesimista cuando no se provee manager (findOne plano)', async () => {
      recetasService.findByPlatillo.mockResolvedValue([
        { ingredienteId: 1, cantidadPorPorcion: 1, esIngredienteClave: false },
      ]);
      repository.findOne.mockResolvedValue({
        id: 1,
        nombre: 'Carne',
        stock: 5,
        stockMinimo: 1,
      });

      await service.descontarStockDePlatillo(10, 1);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });
});
