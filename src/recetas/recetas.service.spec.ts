import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RecetasService } from './recetas.service';
import { RecetaIngrediente } from './entities/receta-ingrediente.entity';
import { Platillo } from '../menu/platillos/entities/platillo.entity';
import { CreateRecetaDto } from './dto/create-receta.dto';

describe('RecetasService', () => {
  let service: RecetasService;
  let recetaRepository: {
    find: jest.Mock;
    delete: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let platilloRepository: {
    findOne: jest.Mock;
  };

  beforeEach(async () => {
    recetaRepository = {
      find: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
      create: jest.fn(
        (dto: Partial<RecetaIngrediente>): Partial<RecetaIngrediente> => ({
          ...dto,
        }),
      ),
      save: jest.fn(
        (entities: RecetaIngrediente[]): Promise<RecetaIngrediente[]> =>
          Promise.resolve(entities),
      ),
    };
    platilloRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecetasService,
        {
          provide: getRepositoryToken(RecetaIngrediente),
          useValue: recetaRepository,
        },
        { provide: getRepositoryToken(Platillo), useValue: platilloRepository },
      ],
    }).compile();

    service = module.get<RecetasService>(RecetasService);
  });

  const dtoValido: CreateRecetaDto = {
    ingredientes: [
      { ingredienteId: 1, cantidadPorPorcion: 0.2, esIngredienteClave: true },
      { ingredienteId: 2, cantidadPorPorcion: 0.5, esIngredienteClave: false },
    ],
  };

  describe('createOrReplace', () => {
    it('lanza BadRequestException si hay ingredientes duplicados', async () => {
      const dtoDuplicado: CreateRecetaDto = {
        ingredientes: [
          {
            ingredienteId: 1,
            cantidadPorPorcion: 0.2,
            esIngredienteClave: true,
          },
          {
            ingredienteId: 1,
            cantidadPorPorcion: 0.5,
            esIngredienteClave: false,
          },
        ],
      };

      await expect(service.createOrReplace(10, dtoDuplicado)).rejects.toThrow(
        BadRequestException,
      );
      expect(platilloRepository.findOne).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si el platillo no existe', async () => {
      platilloRepository.findOne.mockResolvedValue(null);

      await expect(service.createOrReplace(99, dtoValido)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('borra la receta previa y guarda los nuevos ingredientes', async () => {
      const platillo = { id: 10 } as Platillo;
      platilloRepository.findOne.mockResolvedValue(platillo);

      const resultado = await service.createOrReplace(10, dtoValido);

      expect(recetaRepository.delete).toHaveBeenCalledWith({
        platillo: { id: 10 },
      });
      expect(recetaRepository.create).toHaveBeenCalledTimes(2);
      expect(recetaRepository.save).toHaveBeenCalled();
      expect(resultado).toHaveLength(2);
      expect(resultado[0]).toEqual(
        expect.objectContaining({ platillo, ingredienteId: 1 }),
      );
    });
  });

  describe('findByPlatillo', () => {
    it('lanza NotFoundException si el platillo no existe', async () => {
      platilloRepository.findOne.mockResolvedValue(null);

      await expect(service.findByPlatillo(99)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('devuelve los ingredientes del platillo ordenados por id ASC', async () => {
      platilloRepository.findOne.mockResolvedValue({ id: 10 } as Platillo);
      const receta = [{ id: 1, ingredienteId: 1 }] as RecetaIngrediente[];
      recetaRepository.find.mockResolvedValue(receta);

      const resultado = await service.findByPlatillo(10);

      expect(recetaRepository.find).toHaveBeenCalledWith({
        where: { platillo: { id: 10 } },
        order: { id: 'ASC' },
      });
      expect(resultado).toBe(receta);
    });
  });

  describe('removeByPlatillo', () => {
    it('lanza NotFoundException si el platillo no existe', async () => {
      platilloRepository.findOne.mockResolvedValue(null);

      await expect(service.removeByPlatillo(99)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('elimina la receta del platillo existente', async () => {
      platilloRepository.findOne.mockResolvedValue({ id: 10 } as Platillo);

      await service.removeByPlatillo(10);

      expect(recetaRepository.delete).toHaveBeenCalledWith({
        platillo: { id: 10 },
      });
    });
  });

  describe('obtenerIngredientesPorPlatillo', () => {
    it('delega en findByPlatillo', async () => {
      platilloRepository.findOne.mockResolvedValue({ id: 10 } as Platillo);
      const receta = [{ id: 1 }] as RecetaIngrediente[];
      recetaRepository.find.mockResolvedValue(receta);

      const resultado = await service.obtenerIngredientesPorPlatillo(10);

      expect(resultado).toBe(receta);
    });
  });
});
