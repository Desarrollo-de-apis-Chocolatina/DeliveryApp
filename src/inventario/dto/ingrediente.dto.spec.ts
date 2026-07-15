import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateIngredienteDto } from './create-ingrediente.dto';
import { UpdateIngredienteDto } from './update-ingrediente.dto';
import { RegistrarCompraDto } from './registrar-compra.dto';
import { UnidadMedida } from '../entities/ingrediente.entity';

describe('CreateIngredienteDto', () => {
  it('es válido con todos los campos correctos', async () => {
    const dto = plainToInstance(CreateIngredienteDto, {
      nombre: 'Tomate',
      unidadMedida: UnidadMedida.KG,
      stock: 10,
      stockMinimo: 2,
      costoUnitario: 1.5,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('es válido sin stock ni costoUnitario (son opcionales)', async () => {
    const dto = plainToInstance(CreateIngredienteDto, {
      nombre: 'Tomate',
      unidadMedida: UnidadMedida.KG,
      stockMinimo: 2,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rechaza una unidadMedida que no está en el enum', async () => {
    const dto = plainToInstance(CreateIngredienteDto, {
      nombre: 'Tomate',
      unidadMedida: 'kilogramos',
      stockMinimo: 2,
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'unidadMedida')).toBe(true);
  });

  it('rechaza nombre vacío', async () => {
    const dto = plainToInstance(CreateIngredienteDto, {
      nombre: '',
      unidadMedida: UnidadMedida.KG,
      stockMinimo: 2,
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'nombre')).toBe(true);
  });

  it('rechaza stockMinimo negativo', async () => {
    const dto = plainToInstance(CreateIngredienteDto, {
      nombre: 'Tomate',
      unidadMedida: UnidadMedida.KG,
      stockMinimo: -1,
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'stockMinimo')).toBe(true);
  });
});

describe('UpdateIngredienteDto', () => {
  it('es válido sin ningún campo (todos opcionales)', async () => {
    const dto = plainToInstance(UpdateIngredienteDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rechaza stockMinimo negativo si se envía', async () => {
    const dto = plainToInstance(UpdateIngredienteDto, { stockMinimo: -5 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'stockMinimo')).toBe(true);
  });
});

describe('RegistrarCompraDto', () => {
  it('es válido con cantidad y costoUnitario positivos', async () => {
    const dto = plainToInstance(RegistrarCompraDto, {
      cantidad: 5,
      costoUnitario: 2.25,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rechaza cantidad negativa o cero', async () => {
    const dto = plainToInstance(RegistrarCompraDto, {
      cantidad: 0,
      costoUnitario: 2.25,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'cantidad')).toBe(true);
  });

  it('rechaza costoUnitario negativo o cero', async () => {
    const dto = plainToInstance(RegistrarCompraDto, {
      cantidad: 5,
      costoUnitario: 0,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'costoUnitario')).toBe(true);
  });
});
