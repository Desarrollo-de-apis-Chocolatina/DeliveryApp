import { Test, TestingModule } from '@nestjs/testing';
import { InventarioController } from './inventario.controller';
import { InventarioService } from './inventario.service';
import { UnidadMedida } from './entities/ingrediente.entity';

describe('InventarioController', () => {
  let controller: InventarioController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findAlertas: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    registrarCompra: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findAlertas: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      registrarCompra: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventarioController],
      providers: [{ provide: InventarioService, useValue: service }],
    }).compile();

    controller = module.get<InventarioController>(InventarioController);
  });

  it('create delega en InventarioService.create', () => {
    const dto = { nombre: 'Harina', unidadMedida: UnidadMedida.KG, stockMinimo: 5 };

    controller.create(dto as any);

    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('findAll delega en InventarioService.findAll', () => {
    controller.findAll();

    expect(service.findAll).toHaveBeenCalled();
  });

  it('findAlertas delega en InventarioService.findAlertas', () => {
    controller.findAlertas();

    expect(service.findAlertas).toHaveBeenCalled();
  });

  it('findOne delega en InventarioService.findOne con el id parseado', () => {
    controller.findOne(7);

    expect(service.findOne).toHaveBeenCalledWith(7);
  });

  it('update delega en InventarioService.update', () => {
    const dto = { stockMinimo: 3 };

    controller.update(7, dto as any);

    expect(service.update).toHaveBeenCalledWith(7, dto);
  });

  it('registrarCompra delega en InventarioService.registrarCompra', () => {
    const dto = { cantidad: 5, costoUnitario: 2 };

    controller.registrarCompra(7, dto as any);

    expect(service.registrarCompra).toHaveBeenCalledWith(7, dto);
  });

  it('remove delega en InventarioService.remove', () => {
    controller.remove(7);

    expect(service.remove).toHaveBeenCalledWith(7);
  });
});
