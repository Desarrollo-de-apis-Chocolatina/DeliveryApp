import { Test, TestingModule } from '@nestjs/testing';
import { CategoriasController } from './categorias.controller';
import { CategoriasService } from './categorias.service';

describe('CategoriasController', () => {
  let controller: CategoriasController;
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
      controllers: [CategoriasController],
      providers: [{ provide: CategoriasService, useValue: service }],
    }).compile();

    controller = module.get<CategoriasController>(CategoriasController);
  });

  it('create delega en CategoriasService.create', () => {
    const dto = { nombre: 'Bebidas' };

    controller.create(dto);

    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('findAll delega en CategoriasService.findAll', () => {
    controller.findAll();

    expect(service.findAll).toHaveBeenCalled();
  });

  it('findOne delega en CategoriasService.findOne con el id', () => {
    controller.findOne(7);

    expect(service.findOne).toHaveBeenCalledWith(7);
  });

  it('update delega en CategoriasService.update', () => {
    const dto = { nombre: 'Postres' };

    controller.update(7, dto);

    expect(service.update).toHaveBeenCalledWith(7, dto);
  });

  it('remove delega en CategoriasService.remove', () => {
    controller.remove(7);

    expect(service.remove).toHaveBeenCalledWith(7);
  });
});
