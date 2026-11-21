import type { LimitesRetiro, RetiroCripto } from '../../api/billeteraApi';
import { pesos } from '../../shared/formato';
import { validarMonto, type Hash } from './cargaCripto';

/**
 * La máquina de estados de un retiro a la wallet (HU-610). Al pedirlo, el back ya descontó el saldo y firmó el
 * permiso; hasta tener el hash se puede volver a cobrar con el mismo permiso; desde el hash, queda esperar que el
 * back lea el cobro.
 */
export type TipoErrorRetiro =
  | 'firmaRechazada'
  | 'sinFondos'
  | 'otraWallet'
  | 'vencido'
  | 'revertida'
  | 'rechazadoPorElBack'
  | 'inesperado';

export interface ErrorRetiro {
  tipo: TipoErrorRetiro;
  mensaje: string;
}

export type EstadoRetiro =
  | { fase: 'inicial'; error?: string }
  | { fase: 'pidiendo' }
  | { fase: 'listoParaCobrar'; retiro: RetiroCripto }
  | { fase: 'firmando'; retiro: RetiroCripto }
  | { fase: 'confirmando'; retiro: RetiroCripto; hash: Hash }
  | { fase: 'demorado'; retiro: RetiroCripto; hash: Hash }
  | { fase: 'cobrado'; retiro: RetiroCripto; hash: Hash }
  | { fase: 'error'; retiro: RetiroCripto; hash?: Hash; error: ErrorRetiro };

export type AccionRetiro =
  | { tipo: 'montoInvalido'; mensaje: string }
  | { tipo: 'pedir' }
  | { tipo: 'listo'; retiro: RetiroCripto }
  | { tipo: 'falloAlPedir'; mensaje: string }
  | { tipo: 'firmar' }
  | { tipo: 'enviada'; hash: Hash }
  | { tipo: 'demorado' }
  | { tipo: 'reintentar' }
  | { tipo: 'cobrado' }
  | { tipo: 'fallo'; error: ErrorRetiro };

export const ESTADO_INICIAL_RETIRO: EstadoRetiro = { fase: 'inicial' };

const retiro = (estado: EstadoRetiro) => ('retiro' in estado ? estado.retiro : undefined);
const hash = (estado: EstadoRetiro) => ('hash' in estado ? estado.hash : undefined);

export const retiroCriptoReducer = (estado: EstadoRetiro, accion: AccionRetiro): EstadoRetiro => {
  switch (accion.tipo) {
    case 'montoInvalido':
    case 'falloAlPedir':
      return { fase: 'inicial', error: accion.mensaje };
    case 'pedir':
      return { fase: 'pidiendo' };
    case 'listo':
      return { fase: 'listoParaCobrar', retiro: accion.retiro };
    // también después de un cobro revertido: el permiso sigue valiendo hasta que vence
    case 'firmar': {
      const r = retiro(estado);
      return r ? { fase: 'firmando', retiro: r } : estado;
    }
    case 'enviada': {
      const r = retiro(estado);
      return r ? { fase: 'confirmando', retiro: r, hash: accion.hash } : estado;
    }
    case 'demorado':
    case 'reintentar': {
      const r = retiro(estado);
      const h = hash(estado);
      if (!r || !h) return estado;
      return { fase: accion.tipo === 'demorado' ? 'demorado' : 'confirmando', retiro: r, hash: h };
    }
    case 'cobrado': {
      const r = retiro(estado);
      const h = hash(estado);
      return r && h ? { fase: 'cobrado', retiro: r, hash: h } : estado;
    }
    case 'fallo': {
      const r = retiro(estado);
      return r ? { fase: 'error', retiro: r, hash: hash(estado), error: accion.error } : estado;
    }
  }
};

/** El monto con las reglas de la carga, más los topes de retiro y el saldo disponible, antes de pedirlo. */
export const validarMontoRetiro = (
  texto: string,
  limites: LimitesRetiro,
  saldoDisponible: number
): { monto: number } | { error: string } => {
  const validado = validarMonto(texto);
  if ('error' in validado) return validado;
  const { monto } = validado;
  if (monto < limites.minimo)
    return { error: `El mínimo para retirar es ${pesos(limites.minimo)}.` };
  if (monto > limites.maximo)
    return { error: `El máximo para retirar es ${pesos(limites.maximo)}.` };
  if (monto > saldoDisponible) {
    return { error: 'El monto supera tu saldo disponible.' };
  }
  return { monto };
};

/** 0x1234…abcd */
export const walletCorta = (wallet: string) => `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;

/** La hora hasta la que se puede cobrar, en la zona de la Argentina. */
export const horaDeVencimiento = (vence: number) =>
  new Date(vence * 1000).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
