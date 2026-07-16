import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Platillo } from '../menu/platillos/entities/platillo.entity';
import { RecetasService } from '../recetas/recetas.service';
import { InventarioService } from '../inventario/inventario.service';

/**
 * Fila del reporte de rentabilidad de un platillo.
 */
export interface MargenPlatillo {
  platilloId: number;
  nombre: string;
  precio: number;
  costoReceta: number;
  margenNominal: number;
  margenPct: number;
}

@Injectable()
export class RentabilidadService {
  constructor(
    @InjectRepository(Platillo)
    private readonly platilloRepository: Repository<Platillo>,
    private readonly recetasService: RecetasService,
    private readonly inventarioService: InventarioService,
  ) {}

  /**
   * Calcula el margen de cada platillo: precio de venta menos el costo real de
   * su receta (cantidad por porción × costo unitario promedio del ingrediente
   * en inventario). Devuelve el listado ordenado de mayor a menor margen.
   */
  async margenesPorPlatillo(): Promise<MargenPlatillo[]> {
    const platillos = await this.platilloRepository.find();

    const filas: MargenPlatillo[] = [];
    for (const platillo of platillos) {
      const costoReceta = await this.calcularCostoReceta(platillo.id);
      const precio = Number(platillo.precio);
      const margenNominal = precio - costoReceta;

      filas.push({
        platilloId: platillo.id,
        nombre: platillo.nombre,
        precio,
        costoReceta: this.redondear(costoReceta),
        margenNominal: this.redondear(margenNominal),
        margenPct: precio > 0 ? this.redondear((margenNominal / precio) * 100) : 0,
      });
    }

    return filas.sort((a, b) => b.margenNominal - a.margenNominal);
  }

  /** Redondea a 2 decimales para presentar montos financieros limpios. */
  private redondear(valor: number): number {
    return Math.round(valor * 100) / 100;
  }

  private async calcularCostoReceta(platilloId: number): Promise<number> {
    const receta = await this.recetasService.findByPlatillo(platilloId);

    let costo = 0;
    for (const item of receta) {
      try {
        const ingrediente = await this.inventarioService.findOne(
          item.ingredienteId,
        );
        costo += item.cantidadPorPorcion * Number(ingrediente.costoUnitarioPromedio);
      } catch {
        // Ingrediente inexistente o inactivo: no se puede costear, se omite del
        // total sin abortar el reporte completo.
      }
    }
    return costo;
  }
}
