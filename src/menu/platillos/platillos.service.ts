import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Platillo } from './entities/platillo.entity';
import { Categoria } from '../categorias/entities/categoria.entity';
import { CreatePlatilloDto } from './dto/create-platillo.dto';
import { UpdatePlatilloDto } from './dto/update-platillo.dto';

@Injectable()
export class PlatillosService {
  constructor(
    @InjectRepository(Platillo)
    private readonly platilloRepository: Repository<Platillo>,

    @InjectRepository(Categoria)
    private readonly categoriaRepository: Repository<Categoria>,
  ) {}

  private async findPlatilloOrFail(id: number): Promise<Platillo> {
    const platillo = await this.platilloRepository.findOne({
      where: { id },
    });

    if (!platillo) {
      throw new NotFoundException(`El platillo con ID ${id} no existe.`);
    }

    return platillo;
  }

  private async findCategoriaOrFail(id: number): Promise<Categoria> {
    const categoria = await this.categoriaRepository.findOne({
      where: {
        id,
        activa: true,
      },
    });

    if (!categoria) {
      throw new NotFoundException(`La categoría con ID ${id} no existe.`);
    }

    return categoria;
  }

  async create(createPlatilloDto: CreatePlatilloDto): Promise<Platillo> {
    const existe = await this.platilloRepository.findOne({
      where: {
        nombre: createPlatilloDto.nombre,
      },
    });

    if (existe) {
      throw new ConflictException('Ya existe un platillo con ese nombre.');
    }

    const categoria = await this.findCategoriaOrFail(
      createPlatilloDto.categoriaId,
    );

    const platillo = this.platilloRepository.create({
      nombre: createPlatilloDto.nombre,
      descripcion: createPlatilloDto.descripcion,
      precio: createPlatilloDto.precio,
      disponible: createPlatilloDto.disponible ?? true,
      categoria,
    });

    return await this.platilloRepository.save(platillo);
  }

  async findAll(): Promise<Platillo[]> {
    return await this.platilloRepository.find({
      where: {
        disponible: true,
      },
      order: {
        nombre: 'ASC',
      },
    });
  }

  async findOne(id: number): Promise<Platillo> {
    return await this.findPlatilloOrFail(id);
  }

  async update(
    id: number,
    updatePlatilloDto: UpdatePlatilloDto,
  ): Promise<Platillo> {
    const platillo = await this.findPlatilloOrFail(id);

    if (
      updatePlatilloDto.nombre &&
      updatePlatilloDto.nombre !== platillo.nombre
    ) {
      const existe = await this.platilloRepository.findOne({
        where: {
          nombre: updatePlatilloDto.nombre,
        },
      });

      if (existe) {
        throw new ConflictException('Ya existe un platillo con ese nombre.');
      }
    }

    if (updatePlatilloDto.categoriaId) {
      platillo.categoria = await this.findCategoriaOrFail(
        updatePlatilloDto.categoriaId,
      );
    }

    Object.assign(platillo, {
      nombre: updatePlatilloDto.nombre ?? platillo.nombre,
      descripcion: updatePlatilloDto.descripcion ?? platillo.descripcion,
      precio: updatePlatilloDto.precio ?? platillo.precio,
      disponible: updatePlatilloDto.disponible ?? platillo.disponible,
    });

    return await this.platilloRepository.save(platillo);
  }

  async remove(id: number): Promise<Platillo> {
    const platillo = await this.findPlatilloOrFail(id);

    platillo.disponible = false;

    return await this.platilloRepository.save(platillo);
  }

  async marcarNoDisponiblePorIngrediente(ingredienteId: number): Promise<void> {
    // Se implementará en la Fase 7
  }
}
