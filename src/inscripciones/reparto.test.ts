import { describe, expect, it } from 'vitest';
import { centesimosDe, partesIguales } from './reparto';

const pcts = (ids: number[], capitanId: number) =>
  partesIguales(ids, capitanId).map((r) => [r.usuarioId, r.pct]);

describe('reparto del premio en partes iguales (CR-05)', () => {
  it('con dos, mitad y mitad', () => {
    expect(pcts([2, 7], 2)).toEqual([
      [2, 50],
      [7, 50],
    ]);
  });

  it('con tres, el 0,01 que sobra va al capitán aunque no sea el primero', () => {
    expect(pcts([5, 9, 3], 9)).toEqual([
      [5, 33.33],
      [9, 33.34],
      [3, 33.33],
    ]);
  });

  it('con cinco, 20 cada uno', () => {
    expect(pcts([1, 2, 3, 4, 5], 1).map(([, pct]) => pct)).toEqual([20, 20, 20, 20, 20]);
  });

  it('con siete, 14,28 cada uno y 14,32 el capitán', () => {
    expect(pcts([1, 2, 3, 4, 5, 6, 7], 4).map(([, pct]) => pct)).toEqual([
      14.28, 14.28, 14.28, 14.32, 14.28, 14.28, 14.28,
    ]);
  });
});

describe('lo que se escribe en el campo de %', () => {
  it('acepta coma o punto y hasta dos decimales', () => {
    expect(centesimosDe('40')).toBe(4000);
    expect(centesimosDe('33,34')).toBe(3334);
    expect(centesimosDe('12.5')).toBe(1250);
    expect(centesimosDe(' 0 ')).toBe(0);
  });

  it('rechaza lo vacío, lo que no es número, más de dos decimales y lo que pasa de 100', () => {
    expect(centesimosDe('')).toBeNull();
    expect(centesimosDe('abc')).toBeNull();
    expect(centesimosDe('10,123')).toBeNull();
    expect(centesimosDe('100,01')).toBeNull();
    expect(centesimosDe('-1')).toBeNull();
  });
});
