import { Test, TestingModule } from '@nestjs/testing';
import { PedidosDeliveryController } from './pedidos-delivery.controller';
import { PedidosDeliveryService } from './pedidos-delivery.service';
import { EstadoPedidoDelivery } from './entities/pedido-delivery.entity';

describe('PedidosDeliveryController', () => {
  let controller: PedidosDeliveryController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    updateEstado: jest.Mock;
    assignRepartidor: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      updateEstado: jest.fn(),
      assignRepartidor: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PedidosDeliveryController],
      providers: [{ provide: PedidosDeliveryService, useValue: service }],
    }).compile();

    controller = module.get<PedidosDeliveryController>(
      PedidosDeliveryController,
    );
  });

  it('create delega en el service con el dto', () => {
    const dto = {
      direccion: 'Calle 123',
      detalles: [{ platilloId: 5, cantidad: 1 }],
    };

    controller.create(dto);

    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('findAll delega en el service', () => {
    controller.findAll();

    expect(service.findAll).toHaveBeenCalled();
  });

  it('updateEstado delega en el service con el id y el estado', () => {
    controller.updateEstado(7, EstadoPedidoDelivery.LISTO);

    expect(service.updateEstado).toHaveBeenCalledWith(
      7,
      EstadoPedidoDelivery.LISTO,
    );
  });

  it('assignRepartidor delega en el service con el id del pedido y del repartidor', () => {
    controller.assignRepartidor(7, 3);

    expect(service.assignRepartidor).toHaveBeenCalledWith(7, 3);
  });
});
