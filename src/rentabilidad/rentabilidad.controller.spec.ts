import { Test, TestingModule } from '@nestjs/testing';
import { RentabilidadController } from './rentabilidad.controller';
import { RentabilidadService } from './rentabilidad.service';

describe('RentabilidadController', () => {
  let controller: RentabilidadController;
  let service: { margenesPorPlatillo: jest.Mock };

  beforeEach(async () => {
    service = { margenesPorPlatillo: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RentabilidadController],
      providers: [{ provide: RentabilidadService, useValue: service }],
    }).compile();

    controller = module.get<RentabilidadController>(RentabilidadController);
  });

  it('margenesPorPlatillo delega en el service', async () => {
    const data = [{ platilloId: 1 }];
    service.margenesPorPlatillo.mockResolvedValue(data);

    const result = await controller.margenesPorPlatillo();

    expect(result).toBe(data);
    expect(service.margenesPorPlatillo).toHaveBeenCalled();
  });
});
