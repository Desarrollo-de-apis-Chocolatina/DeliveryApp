import { decimalTransformer } from './ingrediente.entity';

describe('decimalTransformer', () => {
  it('convierte un string decimal de la base de datos a number', () => {
    expect(decimalTransformer.from('12.50')).toBe(12.5);
  });

  it('devuelve null tal cual al leer de la base de datos', () => {
    expect(decimalTransformer.from(null)).toBeNull();
  });

  it('devuelve undefined tal cual al leer de la base de datos', () => {
    expect(decimalTransformer.from(undefined)).toBeUndefined();
  });

  it('pasa el number tal cual al escribir a la base de datos', () => {
    expect(decimalTransformer.to(12.5)).toBe(12.5);
  });
});
