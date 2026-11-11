import { billeteraApi, type MovimientoBilletera } from '../../api/billeteraApi';
import { ApiError } from '../../api/httpClient';

/** Cada cuánto se vuelve a pedir la acreditación y hasta cuándo, mientras la red confirma (HU-609). */
export const REINTENTO_MS = 3_000;
export const ESPERA_MAXIMA_MS = 120_000;

/** Pasó la espera máxima y el back sigue sin poder acreditar: la transacción puede confirmarse más tarde. */
export class CargaDemorada extends Error {
  constructor() {
    super('La carga todavía no se confirmó');
    this.name = 'CargaDemorada';
  }
}

// la transacción todavía no tiene las confirmaciones que pide el back, o su nodo no respondió
const sePuedeReintentar = (err: unknown) =>
  err instanceof ApiError &&
  (err.problemDetail?.codigo === 'TRANSACCION_PENDIENTE' || err.status === 503);

/** Se dejó de esperar: se cerró el modal o se salió de la pantalla. */
export class EsperaCancelada extends Error {
  constructor() {
    super('Se dejó de esperar la acreditación');
    this.name = 'EsperaCancelada';
  }
}

const esperar = (ms: number, senal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const reloj = setTimeout(resolve, ms);
    senal?.addEventListener('abort', () => {
      clearTimeout(reloj);
      reject(new EsperaCancelada());
    });
  });

/**
 * Pide al back que acredite la carga con el hash hasta que lo haga, reintentando cada `REINTENTO_MS` mientras
 * la transacción no esté confirmada. Pasado `ESPERA_MAXIMA_MS`, rechaza con `CargaDemorada`; con la `senal`
 * abortada, con `EsperaCancelada`. Cualquier otro error del back es definitivo y se propaga.
 */
export const confirmarHastaAcreditar = async (
  referencia: string,
  hash: string,
  senal?: AbortSignal
): Promise<MovimientoBilletera> => {
  const limite = Date.now() + ESPERA_MAXIMA_MS;
  for (;;) {
    if (senal?.aborted) throw new EsperaCancelada();
    try {
      return await billeteraApi.confirmarCargaCripto(referencia, hash);
    } catch (err) {
      if (!sePuedeReintentar(err)) throw err;
    }
    if (Date.now() + REINTENTO_MS > limite) throw new CargaDemorada();
    await esperar(REINTENTO_MS, senal);
  }
};
