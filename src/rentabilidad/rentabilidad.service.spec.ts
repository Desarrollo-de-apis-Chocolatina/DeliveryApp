import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { RentabilidadService } from './rentabilidad.service';
import { Platillo } from '../menu/platillos/entities/platillo.entity';
import { RecetasService } from '../recetas/recetas.service';
import { InventarioService } from '../inventario/inventario.service';

describe('RentabilidadService', () => {
  let service: RentabilidadService;
  let platilloRepository: { find: jest.Mock };
  let recetasService: { findByPlatillo: jest.Mock };
  let inventarioService: { findOne: jest.Mock };

  beforeEach(async () => {
    platilloRepository = { find: jest.fn() };
    recetasService = { findByPlatillo: jest.fn() };
    inventarioService = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RentabilidadService,
        { provide: getRepositoryToken(Platillo), useValue: platilloRepository },
        { provide: RecetasService, useValue: recetasService },
        { provide: InventarioService, useValue: inventarioService },
      ],
    }).compile();

    service = module.get<RentabilidadService>(RentabilidadService);
  });

  it('calcula costo de receta, margen nominal y porcentual por platillo', async () => {
    // precio llega como string (decimal sin transformer)
    platilloRepository.find.mockResolvedValue([
      { id: 1, nombre: 'Hamburguesa', precio: '10.00' },
    ]);
    recetasService.findByPlatillo.mockResolvedValue([
      { ingredienteId: 1, cantidadPorPorcion: 0.2 },
    ]);
    inventarioService.findOne.mockResolvedValue({ costoUnitarioPromedio: 5 });

    const [row] = await service.margenesPorPlatillo();

    expect(row.platilloId).toBe(1);
    expect(row.costoReceta).toBe(1); // 0.2 * 5
    expect(row.margenNominal).toBe(9); // 10 - 1
    expect(row.margenPct).toBe(90); // 9/10 * 100
  });

  it('omite del costo un ingrediente inexistente sin romper el reporte', async () => {
    platilloRepository.find.mockResolvedValue([
      { id: 1, nombre: 'Hamburguesa', precio: '10.00' },
    ]);
    recetasService.findByPlatillo.mockResolvedValue([
      { ingredienteId: 99, cantidadPorPorcion: 1 },
    ]);
    inventarioService.findOne.mockRejectedValue(new NotFoundException());

    const [row] = await service.margenesPorPlatillo();

    expect(row.costoReceta).toBe(0);
    expect(row.margenNominal).toBe(10);
  });

  it('ordena los platillos de mayor a menor margen nominal', async () => {
    platilloRepository.find.mockResolvedValue([
      { id: 1, nombre: 'Barato', precio: '5.00' },
      { id: 2, nombre: 'Caro', precio: '20.00' },
    ]);
    recetasService.findByPlatillo.mockResolvedValue([]); // sin receta => costo 0
    inventarioService.findOne.mockResolvedValue({ costoUnitarioPromedio: 0 });

    const rows = await service.margenesPorPlatillo();

    expect(rows.map((r) => r.platilloId)).toEqual([2, 1]);
  });
});
