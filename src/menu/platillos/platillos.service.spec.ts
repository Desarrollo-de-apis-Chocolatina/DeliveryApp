import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PlatillosService } from './platillos.service';
import { Platillo } from './entities/platillo.entity';
import { Categoria } from '../categorias/entities/categoria.entity';

describe('PlatillosService', () => {
  let service: PlatillosService;
  let platilloRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let categoriaRepository: {
    findOne: jest.Mock;
  };

  beforeEach(async () => {
    platilloRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(
        (dto: Partial<Platillo>): Partial<Platillo> => ({ ...dto }),
      ),
      save: jest.fn(
        (entity: Platillo): Promise<Platillo> => Promise.resolve(entity),
      ),
    };
    categoriaRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatillosService,
        {
          provide: getRepositoryToken(Platillo),
          useValue: platilloRepository,
        },
        {
          provide: getRepositoryToken(Categoria),
          useValue: categoriaRepository,
        },
      ],
    }).compile();

    service = module.get<PlatillosService>(PlatillosService);
  });

  describe('create', () => {
    it('crea un platillo cuando el nombre no existe y la categoría es válida', async () => {
      platilloRepository.findOne.mockResolvedValue(null);
      categoriaRepository.findOne.mockResolvedValue({
        id: 1,
        nombre: 'Bebidas',
        activa: true,
      });

      const resultado = await service.create({
        nombre: 'Cafe',
        descripcion: 'Cafe negro',
        precio: 2.5,
        categoriaId: 1,
      });

      expect(platilloRepository.save).toHaveBeenCalled();
      expect(resultado.nombre).toBe('Cafe');
      expect(resultado.disponible).toBe(true);
      expect(resultado.categoria).toEqual({
        id: 1,
        nombre: 'Bebidas',
        activa: true,
      });
    });

    it('respeta disponible=false cuando se envía explícitamente', async () => {
      platilloRepository.findOne.mockResolvedValue(null);
      categoriaRepository.findOne.mockResolvedValue({
        id: 1,
        activa: true,
      });

      const resultado = await service.create({
        nombre: 'Cafe',
        precio: 2.5,
        categoriaId: 1,
        disponible: false,
      });

      expect(resultado.disponible).toBe(false);
    });

    it('lanza ConflictException si ya existe un platillo con ese nombre', async () => {
      platilloRepository.findOne.mockResolvedValue({ id: 1, nombre: 'Cafe' });

      await expect(
        service.create({ nombre: 'Cafe', precio: 2.5, categoriaId: 1 }),
      ).rejects.toThrow(ConflictException);
      expect(platilloRepository.save).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si la categoría no existe o no está activa', async () => {
      platilloRepository.findOne.mockResolvedValue(null);
      categoriaRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create({ nombre: 'Cafe', precio: 2.5, categoriaId: 99 }),
      ).rejects.toThrow(NotFoundException);
      expect(platilloRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('devuelve solo platillos disponibles ordenados por nombre', async () => {
      platilloRepository.find.mockResolvedValue([]);

      await service.findAll();

      expect(platilloRepository.find).toHaveBeenCalledWith({
        where: { disponible: true },
        order: { nombre: 'ASC' },
      });
    });
  });

  describe('findOne', () => {
    it('devuelve el platillo si existe', async () => {
      platilloRepository.findOne.mockResolvedValue({ id: 1, nombre: 'Cafe' });

      const resultado = await service.findOne(1);

      expect(resultado).toEqual({ id: 1, nombre: 'Cafe' });
    });

    it('lanza NotFoundException si el platillo no existe', async () => {
      platilloRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('actualiza campos simples sin cambiar el nombre', async () => {
      platilloRepository.findOne.mockResolvedValueOnce({
        id: 1,
        nombre: 'Cafe',
        descripcion: 'viejo',
        precio: 2,
        disponible: true,
      });

      const resultado = await service.update(1, { precio: 3.5 });

      expect(resultado.precio).toBe(3.5);
      expect(resultado.nombre).toBe('Cafe');
      expect(platilloRepository.save).toHaveBeenCalled();
    });

    it('actualiza el nombre cuando el nuevo nombre no está en uso', async () => {
      platilloRepository.findOne
        .mockResolvedValueOnce({
          id: 1,
          nombre: 'Cafe',
          precio: 2,
          disponible: true,
        })
        .mockResolvedValueOnce(null);

      const resultado = await service.update(1, { nombre: 'Te' });

      expect(resultado.nombre).toBe('Te');
    });

    it('cambia la categoría cuando se envía categoriaId válido', async () => {
      platilloRepository.findOne.mockResolvedValueOnce({
        id: 1,
        nombre: 'Cafe',
        precio: 2,
        disponible: true,
      });
      categoriaRepository.findOne.mockResolvedValue({
        id: 5,
        nombre: 'Calientes',
        activa: true,
      });

      const resultado = await service.update(1, { categoriaId: 5 });

      expect(resultado.categoria).toEqual({
        id: 5,
        nombre: 'Calientes',
        activa: true,
      });
    });

    it('lanza ConflictException si el nuevo nombre ya existe en otro platillo', async () => {
      platilloRepository.findOne
        .mockResolvedValueOnce({ id: 1, nombre: 'Cafe' })
        .mockResolvedValueOnce({ id: 2, nombre: 'Te' });

      await expect(service.update(1, { nombre: 'Te' })).rejects.toThrow(
        ConflictException,
      );
      expect(platilloRepository.save).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si la categoría nueva no existe', async () => {
      platilloRepository.findOne.mockResolvedValueOnce({
        id: 1,
        nombre: 'Cafe',
      });
      categoriaRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update(1, { categoriaId: 99 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza NotFoundException si el platillo a actualizar no existe', async () => {
      platilloRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.update(99, { precio: 1 })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('desactiva el platillo (soft delete)', async () => {
      platilloRepository.findOne.mockResolvedValue({
        id: 1,
        nombre: 'Cafe',
        disponible: true,
      });

      const resultado = await service.remove(1);

      expect(resultado.disponible).toBe(false);
      expect(platilloRepository.save).toHaveBeenCalled();
    });

    it('lanza NotFoundException si el platillo a eliminar no existe', async () => {
      platilloRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('marcarNoDisponiblePorIngrediente', () => {
    it('resuelve sin efectos (no-op, pendiente Fase 7)', async () => {
      const resultado = await service.marcarNoDisponiblePorIngrediente(1);

      expect(resultado).toBeUndefined();
      expect(platilloRepository.save).not.toHaveBeenCalled();
      expect(platilloRepository.find).not.toHaveBeenCalled();
      expect(platilloRepository.findOne).not.toHaveBeenCalled();
    });
  });
});
