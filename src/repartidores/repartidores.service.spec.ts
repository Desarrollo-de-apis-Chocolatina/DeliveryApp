import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { RepartidoresService } from './repartidores.service';
import { Repartidor } from './entities/repartidor.entity';
import { Usuario, Rol } from '../usuarios/entities/usuario.entity';
import { CreateRepartidorDto } from './dto/create-repartidor.dto';

describe('RepartidoresService', () => {
  let service: RepartidoresService;
  let repartidorRepository: { find: jest.Mock };
  let manager: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let dataSource: { transaction: jest.Mock };

  const dto: CreateRepartidorDto = {
    nombre: 'Juan',
    email: 'juan@example.com',
    password: 'secreto123',
    telefono: '555-1234',
    vehiculo: 'Moto',
    placa: 'ABC123',
  };

  beforeEach(async () => {
    repartidorRepository = { find: jest.fn() };
    manager = {
      findOne: jest.fn(),
      create: jest.fn((_entity: unknown, data: object) => ({ ...data })),
      save: jest.fn((entity: object) => Promise.resolve(entity)),
    };
    dataSource = {
      transaction: jest.fn((cb: (m: EntityManager) => unknown) =>
        cb(manager as unknown as EntityManager),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepartidoresService,
        {
          provide: getRepositoryToken(Repartidor),
          useValue: repartidorRepository,
        },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<RepartidoresService>(RepartidoresService);
  });

  describe('create', () => {
    it('lanza BadRequestException si el email ya está registrado', async () => {
      manager.findOne.mockResolvedValue({ id: 1, email: dto.email });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('crea un Usuario con rol REPARTIDOR y el Repartidor asociado', async () => {
      manager.findOne.mockResolvedValue(null);

      const resultado = await service.create(dto);

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(manager.findOne).toHaveBeenCalledWith(Usuario, {
        where: { email: dto.email },
      });
      expect(manager.create).toHaveBeenCalledWith(
        Usuario,
        expect.objectContaining({
          nombre: dto.nombre,
          email: dto.email,
          password: dto.password,
          rol: Rol.REPARTIDOR,
          telefono: dto.telefono,
        }),
      );
      expect(manager.create).toHaveBeenCalledWith(
        Repartidor,
        expect.objectContaining({
          vehiculo: dto.vehiculo,
          placa: dto.placa,
        }),
      );
      expect(manager.save).toHaveBeenCalledTimes(2);
      expect(resultado).toEqual(
        expect.objectContaining({ vehiculo: 'Moto', placa: 'ABC123' }),
      );
    });
  });

  describe('findAll', () => {
    it('devuelve la lista de repartidores', async () => {
      const lista = [{ id: 1 }] as Repartidor[];
      repartidorRepository.find.mockResolvedValue(lista);

      const resultado = await service.findAll();

      expect(repartidorRepository.find).toHaveBeenCalled();
      expect(resultado).toBe(lista);
    });
  });
});
