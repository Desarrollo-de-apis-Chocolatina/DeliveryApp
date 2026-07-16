import { Test, TestingModule } from '@nestjs/testing';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';
import { Rol } from './entities/usuario.entity';

describe('UsuariosController', () => {
  let controller: UsuariosController;
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
      controllers: [UsuariosController],
      providers: [{ provide: UsuariosService, useValue: service }],
    }).compile();

    controller = module.get<UsuariosController>(UsuariosController);
  });

  it('create delega en UsuariosService.create', () => {
    const dto = {
      nombre: 'Juan',
      email: 'juan@delivery.com',
      password: 'secret123',
      rol: Rol.MESERO,
    };

    controller.create(dto);

    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('findAll delega en UsuariosService.findAll', () => {
    controller.findAll();

    expect(service.findAll).toHaveBeenCalled();
  });

  it('findOne delega en UsuariosService.findOne con el id', () => {
    controller.findOne('abc');

    expect(service.findOne).toHaveBeenCalledWith('abc');
  });

  it('update delega en UsuariosService.update', () => {
    const dto = { nombre: 'Nuevo' };

    controller.update('abc', dto);

    expect(service.update).toHaveBeenCalledWith('abc', dto);
  });

  it('remove delega en UsuariosService.remove', () => {
    controller.remove('abc');

    expect(service.remove).toHaveBeenCalledWith('abc');
  });
});
