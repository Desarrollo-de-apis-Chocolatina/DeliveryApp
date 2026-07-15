import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecetaIngrediente } from './entities/receta-ingrediente.entity';
import { Platillo } from '../menu/platillos/entities/platillo.entity';
import { CreateRecetaDto } from './dto/create-receta.dto';

@Injectable()
export class RecetasService {
  constructor(
    @InjectRepository(RecetaIngrediente)
    private readonly recetaRepository: Repository<RecetaIngrediente>,

    @InjectRepository(Platillo)
    private readonly platilloRepository: Repository<Platillo>,
  ) {}

  private async findPlatilloOrFail(
    id: number,
  ): Promise<Platillo> {
    const platillo = await this.platilloRepository.findOne({
      where: {
        id,
      },
    });

    if (!platillo) {
      throw new NotFoundException(
        `El platillo con ID ${id} no existe.`,
      );
    }

    return platillo;
  }

  private validarIngredientesSinDuplicados(
    dto: CreateRecetaDto,
  ): void {
    const ids = dto.ingredientes.map(
      (ingrediente) => ingrediente.ingredienteId,
    );

    const idsUnicos = new Set(ids);

    if (idsUnicos.size !== ids.length) {
      throw new BadRequestException(
        'No se permiten ingredientes duplicados dentro de la misma receta.',
      );
    }
  }

  async createOrReplace(
    platilloId: number,
    dto: CreateRecetaDto,
  ): Promise<RecetaIngrediente[]> {
    this.validarIngredientesSinDuplicados(dto);

    const platillo = await this.findPlatilloOrFail(
      platilloId,
    );

    await this.recetaRepository.delete({
      platillo: {
        id: platillo.id,
      },
    });

    const ingredientes = dto.ingredientes.map(
      (ingrediente) =>
        this.recetaRepository.create({
          platillo,
          ingredienteId: ingrediente.ingredienteId,
          cantidadPorPorcion:
            ingrediente.cantidadPorPorcion,
          esIngredienteClave:
            ingrediente.esIngredienteClave,
        }),
    );

    return await this.recetaRepository.save(
      ingredientes,
    );
  }

  async findByPlatillo(
    platilloId: number,
  ): Promise<RecetaIngrediente[]> {
    await this.findPlatilloOrFail(
      platilloId,
    );

    return await this.recetaRepository.find({
      where: {
        platillo: {
          id: platilloId,
        },
      },

      order: {
        id: 'ASC',
      },
    });
  }

  async removeByPlatillo(
    platilloId: number,
  ): Promise<void> {
    await this.findPlatilloOrFail(
      platilloId,
    );

    await this.recetaRepository.delete({
      platillo: {
        id: platilloId,
      },
    });
  }

  async obtenerIngredientesPorPlatillo(
    platilloId: number,
  ): Promise<RecetaIngrediente[]> {
    return await this.findByPlatillo(
      platilloId,
    );
  }
}