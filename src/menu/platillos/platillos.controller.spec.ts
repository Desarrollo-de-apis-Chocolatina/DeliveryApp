import { Test, TestingModule } from '@nestjs/testing';
import { PlatillosController } from './platillos.controller';
import { PlatillosService } from './platillos.service';

describe('PlatillosController', () => {
  let controller: PlatillosController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlatillosController],
      providers: [{ provide: PlatillosService, useValue: service }],
    }).compile();

    controller = module.get<PlatillosController>(PlatillosController);
  });

  it('create delega en PlatillosService.create', () => {
    const dto = { nombre: 'Cafe', precio: 2.5, categoriaId: 1 };

    controller.create(dto);

    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('findAll delega en PlatillosService.findAll', () => {
    controller.findAll();

    expect(service.findAll).toHaveBeenCalled();
  });

  it('findOne delega en PlatillosService.findOne con el id', () => {
    controller.findOne(7);

    expect(service.findOne).toHaveBeenCalledWith(7);
  });

  it('update delega en PlatillosService.update', () => {
    const dto = { precio: 3 };

    controller.update(7, dto);

    expect(service.update).toHaveBeenCalledWith(7, dto);
  });

  it('remove delega en PlatillosService.remove', () => {
    controller.remove(7);

    expect(service.remove).toHaveBeenCalledWith(7);
  });
});
