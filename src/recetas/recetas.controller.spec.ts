import { Test, TestingModule } from '@nestjs/testing';
import { RecetasController } from './recetas.controller';
import { RecetasService } from './recetas.service';
import { CreateRecetaDto } from './dto/create-receta.dto';

describe('RecetasController', () => {
  let controller: RecetasController;
  let service: {
    createOrReplace: jest.Mock;
    findByPlatillo: jest.Mock;
    removeByPlatillo: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      createOrReplace: jest.fn(),
      findByPlatillo: jest.fn(),
      removeByPlatillo: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecetasController],
      providers: [{ provide: RecetasService, useValue: service }],
    }).compile();

    controller = module.get<RecetasController>(RecetasController);
  });

  it('createOrReplace delega en RecetasService.createOrReplace', () => {
    const dto: CreateRecetaDto = {
      ingredientes: [
        { ingredienteId: 1, cantidadPorPorcion: 0.2, esIngredienteClave: true },
      ],
    };

    controller.createOrReplace(10, dto);

    expect(service.createOrReplace).toHaveBeenCalledWith(10, dto);
  });

  it('findByPlatillo delega en RecetasService.findByPlatillo', () => {
    controller.findByPlatillo(10);

    expect(service.findByPlatillo).toHaveBeenCalledWith(10);
  });

  it('removeByPlatillo delega en RecetasService.removeByPlatillo', () => {
    controller.removeByPlatillo(10);

    expect(service.removeByPlatillo).toHaveBeenCalledWith(10);
  });
});
