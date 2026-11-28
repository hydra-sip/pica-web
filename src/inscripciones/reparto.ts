import { RepartoIntegrante } from '../api/inscripcionApi';

/** El 100 % en centésimos: las cuentas del reparto van en enteros para no arrastrar errores de coma flotante. */
export const CIEN = 10000;

/**
 * El reparto del premio en partes iguales (CR-05), como lo arma el back: cada uno con dos decimales redondeando
 * hacia abajo y el sobrante para el capitán, en el orden de `ids`.
 */
export const partesIguales = (ids: number[], capitanId: number): RepartoIntegrante[] => {
  const parte = Math.floor(CIEN / ids.length);
  const sobrante = CIEN - parte * ids.length;
  return ids.map((usuarioId) => ({
    usuarioId,
    pct: (usuarioId === capitanId ? parte + sobrante : parte) / 100,
  }));
};

/** El % escrito en un campo (con coma o punto, de 0 a 100 y hasta dos decimales) en centésimos; si no es válido, null. */
export const centesimosDe = (texto: string): number | null => {
  const limpio = texto.trim().replace(',', '.');
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(limpio)) return null;
  const centesimos = Math.round(Number(limpio) * 100);
  return centesimos <= CIEN ? centesimos : null;
};

/** Un % para mostrar: `33,34`, `40`. */
export const textoPct = (pct: number): string =>
  pct.toLocaleString('es-AR', { maximumFractionDigits: 2, useGrouping: false });

/** Lo que muestran los campos de % para un reparto, por usuario. */
export const textosDe = (reparto: RepartoIntegrante[]): Record<number, string> =>
  Object.fromEntries(reparto.map((r) => [r.usuarioId, textoPct(r.pct)]));

/** Cómo quedan los campos: el reparto que se mandaría, el total en centésimos y si todos los campos son válidos. */
export interface RepartoEscrito {
  reparto: RepartoIntegrante[];
  total: number;
  camposValidos: boolean;
  /** Campos válidos y total exacto 100 %: se puede guardar. */
  valido: boolean;
}

export const leerReparto = (ids: number[], textos: Record<number, string>): RepartoEscrito => {
  const centesimos = ids.map((id) => centesimosDe(textos[id] ?? ''));
  const camposValidos = centesimos.every((c) => c !== null);
  const total = centesimos.reduce<number>((s, c) => s + (c ?? 0), 0);
  return {
    reparto: ids.map((usuarioId, i) => ({ usuarioId, pct: (centesimos[i] ?? 0) / 100 })),
    total,
    camposValidos,
    valido: camposValidos && total === CIEN,
  };
};

/** Si dos repartos le dan lo mismo a cada uno, sin importar el orden. */
export const mismoReparto = (
  a: RepartoIntegrante[] | null | undefined,
  b: RepartoIntegrante[] | null | undefined
): boolean => {
  if (!a || !b || a.length !== b.length) return false;
  const deB = new Map(b.map((r) => [r.usuarioId, Math.round(r.pct * 100)]));
  return a.every((r) => deB.get(r.usuarioId) === Math.round(r.pct * 100));
};
