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

  async registrarCompra(
    id: number,
    dto: RegistrarCompraDto,
  ): Promise<Ingrediente> {
    const ingrediente = await this.findIngredienteOrFail(id);

    const stockActual = ingrediente.stock;
    const costoActual = ingrediente.costoUnitarioPromedio;
    const stockNuevo = stockActual + dto.cantidad;

    ingrediente.costoUnitarioPromedio =
      (stockActual * costoActual + dto.cantidad * dto.costoUnitario) /
      stockNuevo;
    ingrediente.stock = stockNuevo;

    return await this.ingredienteRepository.save(ingrediente);
  }

  async findAlertas(): Promise<Ingrediente[]> {
    const ingredientes = await this.ingredienteRepository.find({
      where: { activo: true },
      order: { nombre: 'ASC' },
    });

    return ingredientes.filter((i) => i.stock <= i.stockMinimo);
  }

  async descontarStockDePlatillo(
    platilloId: number,
    cantidadPorciones: number,
    manager?: EntityManager,
  ): Promise<void> {
    const ingredienteRepo = manager
      ? manager.getRepository(Ingrediente)
      : this.ingredienteRepository;

    const recetaIngredientes =
      await this.recetasService.findByPlatillo(platilloId);

    // Primera pasada: validar que TODOS los ingredientes tengan stock
    // suficiente antes de mutar cualquiera. La validación en sí es siempre
    // todo o nada (no se guarda nada hasta que todos pasen), pero la
    // atomicidad de la segunda pasada (aplicar los descuentos) solo está
    // garantizada cuando el llamador provee un `manager` transaccional: sin
    // él, un error tardío al guardar el ingrediente N dejaría los
    // ingredientes 1..N-1 ya persistidos.
    const descuentos: {
      ingrediente: Ingrediente;
      cantidadADescontar: number;
      esIngredienteClave: boolean;
    }[] = [];

    for (const recetaIngrediente of recetaIngredientes) {
      const cantidadADescontar =
        recetaIngrediente.cantidadPorPorcion * cantidadPorciones;

      // El lock pesimista solo tiene efecto real dentro de una transacción
      // activa (la que el llamador abre y nos pasa como `manager`). Fuera de
      // una transacción, `pessimistic_write` es un no-op o puede fallar
      // según el driver, así que solo lo pedimos cuando hay `manager`.
      const ingrediente = await ingredienteRepo.findOne(
        manager
          ? {
              where: { id: recetaIngrediente.ingredienteId },
              lock: { mode: 'pessimistic_write' },
            }
          : {
              where: { id: recetaIngrediente.ingredienteId },
            },
      );

      if (!ingrediente) {
        throw new NotFoundException(
          `El ingrediente con ID ${recetaIngrediente.ingredienteId} no existe.`,
        );
      }

      if (ingrediente.stock < cantidadADescontar) {
        throw new BadRequestException(
          `Stock insuficiente del ingrediente: ${ingrediente.nombre}`,
        );
      }

      descuentos.push({
        ingrediente,
        cantidadADescontar,
        esIngredienteClave: recetaIngrediente.esIngredienteClave,
      });
    }

    // Segunda pasada: aplicar los descuentos ya validados.
    for (const {
      ingrediente,
      cantidadADescontar,
      esIngredienteClave,
    } of descuentos) {
      ingrediente.stock -= cantidadADescontar;

      await ingredienteRepo.save(ingrediente);

      // Regla 1 (README): solo los ingredientes clave disparan la
      // indisponibilidad automática del platillo al llegar a 0.
      // NOTA: esta llamada NO está cubierta por la transacción del
      // llamador: pasa por el repositorio propio de PlatillosService, no
      // por el `manager` recibido aquí. Si la transacción del llamador
      // hace rollback después, esta notificación no se deshace.
      if (ingrediente.stock <= 0 && esIngredienteClave) {
        await this.platillosService.marcarNoDisponiblePorIngrediente(
          ingrediente.id,
        );
      }
    }
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
