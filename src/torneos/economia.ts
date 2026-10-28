import {
  EconomiaTorneo,
  EconomiaTorneoPayload,
  FaltanteTorneo,
  GastoDetalle,
} from '../api/torneoApi';
import { ProblemDetail } from '../auth/types';

/** Lo que edita el paso 3, como lo tienen los inputs; los premios van en orden de puesto. */
export interface FormEconomia {
  valorInscripcion: string;
  premios: string[];
}

export type ErroresEconomia = Partial<Record<keyof FormEconomia, string>>;

const CIEN = 100;

const texto = (n: number | null): string => (n === null ? '' : String(n));

/** Un borrador sin parte económica arranca como el wireframe: 60/25/15 por puesto. */
export const desdeEconomia = (e: EconomiaTorneo | null): FormEconomia => ({
  valorInscripcion: texto(e?.valorInscripcion ?? null),
  premios: e?.premios.length ? e.premios.map((p) => String(p.pct)) : ['60', '25', '15'],
});

const numero = (valor: string): number | null => {
  if (valor.trim() === '') return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
};

/** Suma con dos decimales, para que 33,33 + 33,33 + 33,34 dé 100 y no 99,99999. */
const sumar = (valores: (number | null)[]): number =>
  Math.round(valores.reduce<number>((total, v) => total + (v ?? 0), 0) * CIEN) / CIEN;

export const sumaPremios = (f: FormEconomia): number => sumar(f.premios.map(numero));

export const aPayloadEconomia = (f: FormEconomia): EconomiaTorneoPayload => ({
  valorInscripcion: Number(f.valorInscripcion),
  premios: f.premios.map(Number),
});

const porcentajeValido = (valor: string): boolean => {
  const n = numero(valor);
  return n !== null && n >= 0 && n <= CIEN;
};

/**
 * Las mismas reglas que PUT /torneos/{id}/economia, para avisar antes de mandar. Que los premios sumen 100 lo
 * exige recién la publicación (`alPublicar`).
 */
export const validarEconomia = (
  f: FormEconomia,
  cupo: number | null,
  alPublicar: boolean
): ErroresEconomia => {
  const errores: ErroresEconomia = {};
  const valor = numero(f.valorInscripcion);
  if (valor === null) {
    errores.valorInscripcion = 'Es obligatorio.';
  } else if (valor <= 0) {
    errores.valorInscripcion = 'Tiene que ser mayor a $ 0.';
  }

  const premios = sumaPremios(f);
  if (f.premios.some((p) => !porcentajeValido(p))) {
    errores.premios = 'Cada puesto lleva un % entre 0 y 100.';
  } else if (premios > CIEN) {
    errores.premios = `Los premios suman ${premios} %: no pueden pasar de 100.`;
  } else if (cupo !== null && f.premios.length > cupo) {
    errores.premios = `Hay ${f.premios.length} puestos con premio y el cupo es de ${cupo}.`;
  } else if (alPublicar && premios !== CIEN) {
    errores.premios = `Los premios suman ${premios} %: para publicar tienen que sumar 100.`;
  }
  return errores;
};

export interface CuentasEconomia {
  recaudacion: number | null;
  gastos: number;
  pozoNeto: number | null;
  /** Monto de cada puesto, en el orden de los premios. */
  porPuesto: (number | null)[];
  /** Lo que paga aparte cada inscripción. */
  gastosAdministrativos: number | null;
  /** Valor más gastos administrativos. */
  totalAPagar: number | null;
}

const porcentaje = (monto: number | null, pct: number | null): number | null =>
  monto === null || pct === null ? null : Math.round(((monto * pct) / CIEN) * 100) / 100;

/**
 * Las cuentas de GET /torneos/{id}/resumen-economico con lo que hay escrito, para verlas mientras se edita:
 * recaudación con el cupo completo, que va entera al pozo; el pozo neto (menos los gastos previstos) repartido por
 * puesto, y lo que paga cada uno con los gastos administrativos.
 */
export const calcular = (
  f: FormEconomia,
  cupo: number | null,
  gastos: GastoDetalle[],
  pctGastosAdministrativos: number
): CuentasEconomia => {
  const valor = numero(f.valorInscripcion);
  const recaudacion = valor === null || cupo === null ? null : valor * cupo;
  const totalGastos = sumar(gastos.map((g) => g.monto));
  const pozoNeto = recaudacion === null ? null : recaudacion - totalGastos;
  const gastosAdministrativos = porcentaje(valor, pctGastosAdministrativos);
  return {
    recaudacion,
    gastos: totalGastos,
    pozoNeto,
    porPuesto: f.premios.map((p) => porcentaje(pozoNeto, numero(p))),
    gastosAdministrativos,
    totalAPagar:
      valor === null || gastosAdministrativos === null ? null : valor + gastosAdministrativos,
  };
};

/** El paso del asistente donde se corrige cada faltante del 409 TORNEO_INCOMPLETO. */
export const FALTANTES: Record<FaltanteTorneo, { texto: string; paso: 1 | 2 | 3 }> = {
  INFORMACION: { texto: 'Completar los datos generales, las fechas o el reglamento.', paso: 1 },
  CIERRE_VENCIDO: {
    texto: 'El cierre de la inscripción ya pasó: elegí una fecha futura.',
    paso: 1,
  },
  CUPOS: { texto: 'Completar los cupos y, si es por equipos, la nómina.', paso: 2 },
  ECONOMIA: { texto: 'Guardar el valor de la inscripción.', paso: 3 },
  SIN_PREMIOS: { texto: 'Cargar al menos un puesto con premio.', paso: 3 },
  PREMIOS_NO_SUMAN_100: { texto: 'Los premios por puesto tienen que sumar 100 %.', paso: 3 },
  POZO_NETO_NO_POSITIVO: {
    texto: 'Con el cupo mínimo, los gastos se comen el pozo: bajá los gastos o subí el valor.',
    paso: 3,
  },
};

/** Los faltantes de un 409 TORNEO_INCOMPLETO; vacío si el error es otro. */
export const faltantesDe = (err: unknown): FaltanteTorneo[] => {
  const problema = (err as { problemDetail?: ProblemDetail } | null)?.problemDetail;
  if (problema?.codigo !== 'TORNEO_INCOMPLETO') return [];
  return (problema.faltantes ?? []).filter((f): f is FaltanteTorneo => f in FALTANTES);
};
