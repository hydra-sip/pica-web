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
  pctPozoCompetidores: string;
  pctPremioRifa: string;
  pctComision: string;
  premios: string[];
}

export type ErroresEconomia = Partial<Record<keyof FormEconomia, string>>;

const CIEN = 100;

const texto = (n: number | null): string => (n === null ? '' : String(n));

/**
 * Un borrador sin parte económica arranca como el wireframe: 90 % a competidores, 0 a la rifa, la comisión en el
 * tope de la plataforma y 60/25/15 por puesto.
 */
export const desdeEconomia = (e: EconomiaTorneo | null, comisionMaxima: number): FormEconomia => {
  if (!e || e.pctPozoCompetidores === null) {
    return {
      valorInscripcion: texto(e?.valorInscripcion ?? null),
      pctPozoCompetidores: String(CIEN - comisionMaxima),
      pctPremioRifa: '0',
      pctComision: String(comisionMaxima),
      premios: e?.premios.length ? e.premios.map((p) => String(p.pct)) : ['60', '25', '15'],
    };
  }
  return {
    valorInscripcion: texto(e.valorInscripcion),
    pctPozoCompetidores: texto(e.pctPozoCompetidores),
    pctPremioRifa: texto(e.pctPremioRifa),
    pctComision: texto(e.pctComision),
    premios: e.premios.map((p) => String(p.pct)),
  };
};

const numero = (valor: string): number | null => {
  if (valor.trim() === '') return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
};

/** Suma con dos decimales, para que 33,33 + 33,33 + 33,34 dé 100 y no 99,99999. */
const sumar = (valores: (number | null)[]): number =>
  Math.round(valores.reduce<number>((total, v) => total + (v ?? 0), 0) * CIEN) / CIEN;

export const sumaReparto = (f: FormEconomia): number =>
  sumar([numero(f.pctPozoCompetidores), numero(f.pctPremioRifa), numero(f.pctComision)]);

export const sumaPremios = (f: FormEconomia): number => sumar(f.premios.map(numero));

export const aPayloadEconomia = (f: FormEconomia): EconomiaTorneoPayload => ({
  valorInscripcion: Number(f.valorInscripcion),
  pctPozoCompetidores: Number(f.pctPozoCompetidores),
  pctPremioRifa: Number(f.pctPremioRifa),
  pctComision: Number(f.pctComision),
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
  comisionMaxima: number,
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

  (['pctPozoCompetidores', 'pctPremioRifa', 'pctComision'] as const).forEach((campo) => {
    if (!porcentajeValido(f[campo])) errores[campo] = 'Entre 0 y 100.';
  });
  if (!errores.pctPozoCompetidores && !errores.pctPremioRifa && !errores.pctComision) {
    const suma = sumaReparto(f);
    if (suma !== CIEN) {
      errores.pctPozoCompetidores = `Competidores, rifa y comisión suman ${suma} %: tienen que sumar 100.`;
    }
  }
  const comision = numero(f.pctComision);
  if (!errores.pctComision && comision !== null && comision > comisionMaxima) {
    errores.pctComision = `La comisión de la plataforma no puede pasar del ${comisionMaxima} %.`;
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
  comision: number | null;
  premioRifa: number | null;
  pozoCompetidores: number | null;
  gastos: number;
  pozoNeto: number | null;
  /** Monto de cada puesto, en el orden de los premios. */
  porPuesto: (number | null)[];
}

const porcentaje = (monto: number | null, pct: number | null): number | null =>
  monto === null || pct === null ? null : Math.round(((monto * pct) / CIEN) * 100) / 100;

/**
 * Las cuentas de GET /torneos/{id}/resumen-economico con lo que hay escrito, para verlas mientras se edita:
 * recaudación con el cupo completo, la bolsa repartida por sus %, y el pozo neto (competidores menos gastos)
 * repartido por puesto.
 */
export const calcular = (
  f: FormEconomia,
  cupo: number | null,
  gastos: GastoDetalle[]
): CuentasEconomia => {
  const valor = numero(f.valorInscripcion);
  const recaudacion = valor === null || cupo === null ? null : valor * cupo;
  const pozoCompetidores = porcentaje(recaudacion, numero(f.pctPozoCompetidores));
  const totalGastos = sumar(gastos.map((g) => g.monto));
  const pozoNeto = pozoCompetidores === null ? null : pozoCompetidores - totalGastos;
  return {
    recaudacion,
    comision: porcentaje(recaudacion, numero(f.pctComision)),
    premioRifa: porcentaje(recaudacion, numero(f.pctPremioRifa)),
    pozoCompetidores,
    gastos: totalGastos,
    pozoNeto,
    porPuesto: f.premios.map((p) => porcentaje(pozoNeto, numero(p))),
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
  ECONOMIA: { texto: 'Guardar el valor de la inscripción y el reparto.', paso: 3 },
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
