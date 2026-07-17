import { Test, TestingModule } from '@nestjs/testing';
import { RepartidoresController } from './repartidores.controller';
import { RepartidoresService } from './repartidores.service';
import { CreateRepartidorDto } from './dto/create-repartidor.dto';

describe('RepartidoresController', () => {
  let controller: RepartidoresController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RepartidoresController],
      providers: [{ provide: RepartidoresService, useValue: service }],
    }).compile();

    controller = module.get<RepartidoresController>(RepartidoresController);
  });

  it('create delega en RepartidoresService.create', () => {
    const dto: CreateRepartidorDto = {
      nombre: 'Juan',
      email: 'juan@example.com',
      password: 'secreto123',
      telefono: '555-1234',
      vehiculo: 'Moto',
      placa: 'ABC123',
    };

    controller.create(dto);

    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('findAll delega en RepartidoresService.findAll', () => {
    controller.findAll();

    expect(service.findAll).toHaveBeenCalled();
  });
});
