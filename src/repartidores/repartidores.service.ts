import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Repartidor } from './entities/repartidor.entity';
import { CreateRepartidorDto } from './dto/create-repartidor.dto';
import { Usuario, Rol } from '../usuarios/entities/usuario.entity';

@Injectable()
export class RepartidoresService {
  constructor(
    @InjectRepository(Repartidor)
    private readonly repartidorRepository: Repository<Repartidor>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateRepartidorDto): Promise<Repartidor> {
    return await this.dataSource.transaction(async (manager) => {
      const existingUser = await manager.findOne(Usuario, { where: { email: dto.email } });
      if (existingUser) {
        throw new BadRequestException('El email ya está registrado');
      }

      const usuario = manager.create(Usuario, {
        nombre: dto.nombre,
        email: dto.email,
        password: dto.password,
        rol: Rol.REPARTIDOR,
        telefono: dto.telefono,
      });
      await manager.save(usuario);

      const repartidor = manager.create(Repartidor, {
        usuario,
        vehiculo: dto.vehiculo,
        placa: dto.placa,
      });
      return await manager.save(repartidor);
    });
  }

  async findAll(): Promise<Repartidor[]> {
    return await this.repartidorRepository.find();
  }
}
