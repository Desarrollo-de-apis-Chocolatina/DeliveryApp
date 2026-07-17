import { Test, TestingModule } from '@nestjs/testing';
import { CajaController } from './caja.controller';
import { CajaService } from './caja.service';
import { CanalPedido, TipoPago } from './entities/pago.entity';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('CajaController', () => {
  let controller: CajaController;
  let service: { registrarPago: jest.Mock; cierreDiario: jest.Mock };

  beforeEach(async () => {
    service = { registrarPago: jest.fn(), cierreDiario: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CajaController],
      providers: [{ provide: CajaService, useValue: service }],
    }).compile();

    controller = module.get<CajaController>(CajaController);
  });

  it('registrarPago delega en el service con el DTO y el UUID del cajero autenticado', async () => {
    const dto = {
      canal: CanalPedido.MESA,
      pedidoId: 1,
      tipoPago: TipoPago.EFECTIVO,
    };
    const user = { sub: 'cajero-uuid', email: 'c@x.com', rol: 'cajero' } as JwtPayload;
    service.registrarPago.mockResolvedValue({ id: 1 });

    await controller.registrarPago(dto, user);

    expect(service.registrarPago).toHaveBeenCalledWith(dto, 'cajero-uuid');
  });

  it('cierreDiario delega en el service con la fecha del query', async () => {
    service.cierreDiario.mockResolvedValue({ fecha: '2026-07-16' });

    await controller.cierreDiario({ fecha: '2026-07-16' });

    expect(service.cierreDiario).toHaveBeenCalledWith('2026-07-16');
  });
});
