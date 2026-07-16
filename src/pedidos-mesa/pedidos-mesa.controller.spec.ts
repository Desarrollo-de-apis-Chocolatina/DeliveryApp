import { Test, TestingModule } from '@nestjs/testing';
import { PedidosMesaController } from './pedidos-mesa.controller';
import { PedidosMesaService } from './pedidos-mesa.service';
import { EstadoPedidoMesa } from './entities/pedido-mesa.entity';

describe('PedidosMesaController', () => {
  let controller: PedidosMesaController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    updateEstado: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      updateEstado: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PedidosMesaController],
      providers: [{ provide: PedidosMesaService, useValue: service }],
    }).compile();

    controller = module.get<PedidosMesaController>(PedidosMesaController);
  });

  it('create delega en el service pasando el dto y el id del mesero (req.user.sub)', () => {
    const dto = { numeroMesa: 2, detalles: [{ platilloId: 5, cantidad: 1 }] };
    const req = { user: { sub: 'mesero-1' } };

    controller.create(dto, req);

    expect(service.create).toHaveBeenCalledWith(dto, 'mesero-1');
  });

  it('findAll delega en el service', () => {
    controller.findAll();

    expect(service.findAll).toHaveBeenCalled();
  });

  it('updateEstado delega en el service con el id y el estado', () => {
    controller.updateEstado(7, EstadoPedidoMesa.LISTO);

    expect(service.updateEstado).toHaveBeenCalledWith(7, EstadoPedidoMesa.LISTO);
  });
});
