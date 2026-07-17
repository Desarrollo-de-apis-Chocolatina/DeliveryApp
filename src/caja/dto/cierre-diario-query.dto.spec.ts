import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CierreDiarioQueryDto } from './cierre-diario-query.dto';

describe('CierreDiarioQueryDto', () => {
  it('es válido con formato YYYY-MM-DD', async () => {
    const dto = plainToInstance(CierreDiarioQueryDto, { fecha: '2026-07-16' });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rechaza una fecha con formato inválido', async () => {
    const dto = plainToInstance(CierreDiarioQueryDto, { fecha: 'abc' });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'fecha')).toBe(true);
  });

  it('rechaza fecha vacía', async () => {
    const dto = plainToInstance(CierreDiarioQueryDto, {});

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'fecha')).toBe(true);
  });
});
