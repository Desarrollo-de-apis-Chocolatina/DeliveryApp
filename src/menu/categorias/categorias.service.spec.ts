import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CategoriasService } from './categorias.service';
import { Categoria } from './entities/categoria.entity';

describe('CategoriasService', () => {
  let service: CategoriasService;
  let repository: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(
        (dto: Partial<Categoria>): Partial<Categoria> => ({ ...dto }),
      ),
      save: jest.fn(
        (entity: Categoria): Promise<Categoria> => Promise.resolve(entity),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriasService,
        { provide: getRepositoryToken(Categoria), useValue: repository },
      ],
    }).compile();

    service = module.get<CategoriasService>(CategoriasService);
  });

  describe('create', () => {
    it('crea una categoría cuando el nombre no existe', async () => {
      repository.findOne.mockResolvedValue(null);

      const resultado = await service.create({
        nombre: 'Bebidas',
        descripcion: 'Refrescos',
      });

      expect(repository.create).toHaveBeenCalledWith({
        nombre: 'Bebidas',
        descripcion: 'Refrescos',
      });
      expect(repository.save).toHaveBeenCalled();
      expect(resultado.nombre).toBe('Bebidas');
    });

    it('lanza ConflictException si ya existe una categoría con ese nombre', async () => {
      repository.findOne.mockResolvedValue({ id: 1, nombre: 'Bebidas' });

      await expect(service.create({ nombre: 'Bebidas' })).rejects.toThrow(
        ConflictException,
      );
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('devuelve solo categorías activas ordenadas por nombre', async () => {
      repository.find.mockResolvedValue([]);

      await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({
        where: { activa: true },
        order: { nombre: 'ASC' },
      });
    });
  });

  describe('findOne', () => {
    it('devuelve la categoría si existe', async () => {
      repository.findOne.mockResolvedValue({ id: 1, nombre: 'Bebidas' });

      const resultado = await service.findOne(1);

      expect(resultado).toEqual({ id: 1, nombre: 'Bebidas' });
    });

    it('lanza NotFoundException si la categoría no existe', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('actualiza la categoría cuando no se cambia el nombre', async () => {
      repository.findOne.mockResolvedValueOnce({
        id: 1,
        nombre: 'Bebidas',
        descripcion: 'vieja',
        activa: true,
      });

      const resultado = await service.update(1, { descripcion: 'nueva' });

      expect(resultado.descripcion).toBe('nueva');
      expect(resultado.nombre).toBe('Bebidas');
      expect(repository.save).toHaveBeenCalled();
    });

    it('actualiza el nombre cuando el nuevo nombre no está en uso', async () => {
      repository.findOne
        .mockResolvedValueOnce({ id: 1, nombre: 'Bebidas', activa: true })
        .mockResolvedValueOnce(null);

      const resultado = await service.update(1, { nombre: 'Postres' });

      expect(resultado.nombre).toBe('Postres');
    });

    it('lanza ConflictException si el nuevo nombre ya existe en otra categoría', async () => {
      repository.findOne
        .mockResolvedValueOnce({ id: 1, nombre: 'Bebidas', activa: true })
        .mockResolvedValueOnce({ id: 2, nombre: 'Postres' });

      await expect(
        service.update(1, { nombre: 'Postres' }),
      ).rejects.toThrow(ConflictException);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si la categoría a actualizar no existe', async () => {
      repository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.update(99, { descripcion: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('desactiva la categoría (soft delete)', async () => {
      repository.findOne.mockResolvedValue({
        id: 1,
        nombre: 'Bebidas',
        activa: true,
      });

      const resultado = await service.remove(1);

      expect(resultado.activa).toBe(false);
      expect(repository.save).toHaveBeenCalled();
    });

    it('lanza NotFoundException si la categoría a eliminar no existe', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(NotFoundException);
    });
  });
});
