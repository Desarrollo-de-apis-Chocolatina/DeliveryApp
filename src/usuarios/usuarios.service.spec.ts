import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { Usuario, Rol } from './entities/usuario.entity';

describe('UsuariosService', () => {
  let service: UsuariosService;
  let repository: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let queryBuilder: {
    addSelect: jest.Mock;
    where: jest.Mock;
    getOne: jest.Mock;
  };

  beforeEach(async () => {
    queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };
    repository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(
        (dto: Partial<Usuario>): Partial<Usuario> => ({ ...dto }),
      ),
      save: jest.fn(
        (entity: Usuario): Promise<Usuario> => Promise.resolve(entity),
      ),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        { provide: getRepositoryToken(Usuario), useValue: repository },
      ],
    }).compile();

    service = module.get<UsuariosService>(UsuariosService);
  });

  describe('create', () => {
    it('crea un usuario cuando el email no existe', async () => {
      repository.findOne.mockResolvedValue(null);

      const resultado = await service.create({
        nombre: 'Juan',
        email: 'juan@delivery.com',
        password: 'secret123',
      });

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email: 'juan@delivery.com' },
      });
      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
      expect(resultado.email).toBe('juan@delivery.com');
    });

    it('lanza ConflictException si ya existe un usuario con ese email', async () => {
      repository.findOne.mockResolvedValue({
        id: 'abc',
        email: 'juan@delivery.com',
      });

      await expect(
        service.create({
          nombre: 'Juan',
          email: 'juan@delivery.com',
          password: 'secret123',
        }),
      ).rejects.toThrow(ConflictException);
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('devuelve solo usuarios activos', async () => {
      const usuarios = [{ id: '1', activo: true }];
      repository.find.mockResolvedValue(usuarios);

      const resultado = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({ where: { activo: true } });
      expect(resultado).toBe(usuarios);
    });
  });

  describe('findOne', () => {
    it('devuelve el usuario si existe', async () => {
      const usuario = { id: '1', email: 'a@b.com' };
      repository.findOne.mockResolvedValue(usuario);

      const resultado = await service.findOne('1');

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(resultado).toBe(usuario);
    });

    it('lanza NotFoundException si el usuario no existe', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('99')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('usa el query builder con addSelect del password y devuelve el usuario', async () => {
      const usuario = { id: '1', email: 'a@b.com', password: 'hash' };
      queryBuilder.getOne.mockResolvedValue(usuario);

      const resultado = await service.findByEmail('a@b.com');

      expect(repository.createQueryBuilder).toHaveBeenCalledWith('usuario');
      expect(queryBuilder.addSelect).toHaveBeenCalledWith('usuario.password');
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'usuario.email = :email',
        { email: 'a@b.com' },
      );
      expect(resultado).toBe(usuario);
    });

    it('devuelve null si el email no existe', async () => {
      queryBuilder.getOne.mockResolvedValue(null);

      const resultado = await service.findByEmail('nope@b.com');

      expect(resultado).toBeNull();
    });
  });

  describe('update', () => {
    it('actualiza y guarda el usuario existente', async () => {
      const usuario = { id: '1', nombre: 'Viejo', rol: Rol.MESERO };
      repository.findOne.mockResolvedValue(usuario);

      const resultado = await service.update('1', { nombre: 'Nuevo' });

      expect(resultado.nombre).toBe('Nuevo');
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: '1', nombre: 'Nuevo' }),
      );
    });

    it('lanza NotFoundException si el usuario a actualizar no existe', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update('99', { nombre: 'Nuevo' }),
      ).rejects.toThrow(NotFoundException);
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('desactiva el usuario (soft delete) y devuelve mensaje', async () => {
      const usuario = { id: '1', email: 'a@b.com', activo: true };
      repository.findOne.mockResolvedValue(usuario);

      const resultado = await service.remove('1');

      expect(usuario.activo).toBe(false);
      expect(repository.save).toHaveBeenCalledWith(usuario);
      expect(resultado.message).toContain('a@b.com');
    });

    it('lanza NotFoundException si el usuario a eliminar no existe', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove('99')).rejects.toThrow(NotFoundException);
      expect(repository.save).not.toHaveBeenCalled();
    });
  });
});
