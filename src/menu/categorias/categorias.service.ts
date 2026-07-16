import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Categoria } from './entities/categoria.entity';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';

@Injectable()
export class CategoriasService {
  constructor(
    @InjectRepository(Categoria)
    private readonly categoriaRepository: Repository<Categoria>,
  ) {}

  async create(
    createCategoriaDto: CreateCategoriaDto,
  ): Promise<Categoria> {
    const categoriaExistente = await this.categoriaRepository.findOne({
      where: {
        nombre: createCategoriaDto.nombre,
      },
    });

    if (categoriaExistente) {
      throw new ConflictException(
        'Ya existe una categoría con ese nombre.',
      );
    }

    const categoria = this.categoriaRepository.create(createCategoriaDto);

    return await this.categoriaRepository.save(categoria);
  }

  async findAll(): Promise<Categoria[]> {
    return await this.categoriaRepository.find({
      where: {
        activa: true,
      },
      order: {
        nombre: 'ASC',
      },
    });
  }

  async findOne(id: number): Promise<Categoria> {
    return await this.findCategoriaOrFail(id);
  }

  async update(
    id: number,
    updateCategoriaDto: UpdateCategoriaDto,
  ): Promise<Categoria> {
    const categoria = await this.findCategoriaOrFail(id);

    if (
      updateCategoriaDto.nombre &&
      updateCategoriaDto.nombre !== categoria.nombre
    ) {
      const categoriaExistente = await this.categoriaRepository.findOne({
        where: {
          nombre: updateCategoriaDto.nombre,
        },
      });

      if (categoriaExistente) {
        throw new ConflictException(
          'Ya existe una categoría con ese nombre.',
        );
      }
    }

    Object.assign(categoria, updateCategoriaDto);

    return await this.categoriaRepository.save(categoria);
  }

  async remove(id: number): Promise<Categoria> {
    const categoria = await this.findCategoriaOrFail(id);

    categoria.activa = false;

    return await this.categoriaRepository.save(categoria);
  }

  private async findCategoriaOrFail(
    id: number,
  ): Promise<Categoria> {
    const categoria = await this.categoriaRepository.findOne({
      where: { id },
    });

    if (!categoria) {
      throw new NotFoundException(
        `La categoría con ID ${id} no existe.`,
      );
    }

    return categoria;
  }
}