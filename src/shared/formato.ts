// Formatos de pantalla en español de Argentina. La API manda montos como número o string
// decimal y fechas en ISO (`2026-10-24` o `2026-10-24T18:30:00Z`).

type Fecha = string | Date | null | undefined;

const PESOS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });
const SOLO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
const dos = (n: number) => String(n).padStart(2, '0');

/** `1500` → `$ 1.500,00`. Sin monto, `-`. */
export const pesos = (monto: number | string | null | undefined): string => {
  if (monto === null || monto === undefined || monto === '') return '-';
  const n = typeof monto === 'number' ? monto : Number(monto);
  return Number.isFinite(n) ? PESOS.format(n) : '-';
};

const aDate = (valor: Fecha): Date | null => {
  if (!valor) return null;
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor;
  // Una fecha sola se arma en hora local: `new Date('2000-05-10')` es UTC y acá muestra el día anterior.
  const solo = SOLO_FECHA.exec(valor);
  const d = solo ? new Date(+solo[1], +solo[2] - 1, +solo[3]) : new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** `2026-10-24` o un ISO con hora → `24/10/2026`. Sin fecha, `-`. */
export const fecha = (valor: Fecha): string => {
  const d = aDate(valor);
  return d ? `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()}` : '-';
};

/** ISO con hora → `24/10/2026 18:30`, en la hora del navegador. Sin fecha, `-`. */
export const fechaHora = (valor: Fecha): string => {
  const d = aDate(valor);
  return d ? `${fecha(d)} ${dos(d.getHours())}:${dos(d.getMinutes())}` : '-';
};
