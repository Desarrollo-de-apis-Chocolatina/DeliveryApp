import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Ingrediente } from './entities/ingrediente.entity';
import { CreateIngredienteDto } from './dto/create-ingrediente.dto';
import { UpdateIngredienteDto } from './dto/update-ingrediente.dto';
import { RegistrarCompraDto } from './dto/registrar-compra.dto';
import { RecetasService } from '../recetas/recetas.service';
import { PlatillosService } from '../menu/platillos/platillos.service';

@Injectable()
export class InventarioService {
  constructor(
    @InjectRepository(Ingrediente)
    private readonly ingredienteRepository: Repository<Ingrediente>,
    private readonly recetasService: RecetasService,
    private readonly platillosService: PlatillosService,
  ) {}

  async create(dto: CreateIngredienteDto): Promise<Ingrediente> {
    const existente = await this.ingredienteRepository.findOne({
      where: { nombre: dto.nombre },
    });

    if (existente) {
      throw new ConflictException('Ya existe un ingrediente con ese nombre.');
    }

    const ingrediente = this.ingredienteRepository.create({
      nombre: dto.nombre,
      unidadMedida: dto.unidadMedida,
      stock: dto.stock ?? 0,
      stockMinimo: dto.stockMinimo,
      costoUnitarioPromedio: dto.costoUnitario ?? 0,
    });

    return await this.ingredienteRepository.save(ingrediente);
  }

  async findAll(): Promise<Ingrediente[]> {
    return await this.ingredienteRepository.find({
      where: { activo: true },
      order: { nombre: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Ingrediente> {
    return await this.findIngredienteOrFail(id);
  }

  async update(id: number, dto: UpdateIngredienteDto): Promise<Ingrediente> {
    const ingrediente = await this.findIngredienteOrFail(id);

    if (dto.nombre && dto.nombre !== ingrediente.nombre) {
      const existente = await this.ingredienteRepository.findOne({
        where: { nombre: dto.nombre },
      });

      if (existente) {
        throw new ConflictException('Ya existe un ingrediente con ese nombre.');
      }
    }

    Object.assign(ingrediente, {
      nombre: dto.nombre ?? ingrediente.nombre,
      unidadMedida: dto.unidadMedida ?? ingrediente.unidadMedida,
      stockMinimo: dto.stockMinimo ?? ingrediente.stockMinimo,
    });

    return await this.ingredienteRepository.save(ingrediente);
  }

  async remove(id: number): Promise<Ingrediente> {
    const ingrediente = await this.findIngredienteOrFail(id);

    ingrediente.activo = false;

    return await this.ingredienteRepository.save(ingrediente);
  }

  private async findIngredienteOrFail(id: number): Promise<Ingrediente> {
    const ingrediente = await this.ingredienteRepository.findOne({
      where: { id },
    });

    if (!ingrediente) {
      throw new NotFoundException(`El ingrediente con ID ${id} no existe.`);
    }

    return ingrediente;
  }
}
