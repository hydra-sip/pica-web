import { formatEther } from 'viem';
import type { CargaCripto, MovimientoBilletera } from '../../api/billeteraApi';

/**
 * La máquina de estados de una carga con cripto (HU-609). Hasta tener el hash, la carga se puede volver a pagar
 * con la misma referencia; desde el hash, lo que queda es esperar que el back la acredite.
 */
export type TipoErrorCarga =
  'firmaRechazada' | 'sinFondos' | 'revertida' | 'rechazadaPorElBack' | 'inesperado';

export interface ErrorCarga {
  tipo: TipoErrorCarga;
  mensaje: string;
}

export type Hash = `0x${string}`;

export type EstadoCarga =
  | { fase: 'inicial'; error?: string }
  | { fase: 'iniciando' }
  | { fase: 'listoParaPagar'; carga: CargaCripto }
  | { fase: 'firmando'; carga: CargaCripto }
  | { fase: 'confirmando'; carga: CargaCripto; hash: Hash }
  | { fase: 'demorada'; carga: CargaCripto; hash: Hash }
  | { fase: 'acreditado'; carga: CargaCripto; hash: Hash; movimiento: MovimientoBilletera }
  | { fase: 'error'; carga: CargaCripto; hash?: Hash; error: ErrorCarga };

export type AccionCarga =
  | { tipo: 'montoInvalido'; mensaje: string }
  | { tipo: 'iniciar' }
  | { tipo: 'iniciada'; carga: CargaCripto }
  | { tipo: 'falloAlIniciar'; mensaje: string }
  | { tipo: 'firmar' }
  | { tipo: 'enviada'; hash: Hash }
  | { tipo: 'demorada' }
  | { tipo: 'reintentar' }
  | { tipo: 'acreditada'; movimiento: MovimientoBilletera }
  | { tipo: 'fallo'; error: ErrorCarga };

export const ESTADO_INICIAL: EstadoCarga = { fase: 'inicial' };

const carga = (estado: EstadoCarga) => ('carga' in estado ? estado.carga : undefined);
const hash = (estado: EstadoCarga) => ('hash' in estado ? estado.hash : undefined);

export const cargaCriptoReducer = (estado: EstadoCarga, accion: AccionCarga): EstadoCarga => {
  switch (accion.tipo) {
    case 'montoInvalido':
    case 'falloAlIniciar':
      return { fase: 'inicial', error: accion.mensaje };
    case 'iniciar':
      return { fase: 'iniciando' };
    case 'iniciada':
      return { fase: 'listoParaPagar', carga: accion.carga };
    case 'firmar': {
      const c = carga(estado);
      return c && !hash(estado) ? { fase: 'firmando', carga: c } : estado;
    }
    case 'enviada': {
      const c = carga(estado);
      return c ? { fase: 'confirmando', carga: c, hash: accion.hash } : estado;
    }
    case 'demorada':
    case 'reintentar': {
      const c = carga(estado);
      const h = hash(estado);
      if (!c || !h) return estado;
      return { fase: accion.tipo === 'demorada' ? 'demorada' : 'confirmando', carga: c, hash: h };
    }
    case 'acreditada': {
      const c = carga(estado);
      const h = hash(estado);
      return c && h
        ? { fase: 'acreditado', carga: c, hash: h, movimiento: accion.movimiento }
        : estado;
    }
    case 'fallo': {
      const c = carga(estado);
      return c ? { fase: 'error', carga: c, hash: hash(estado), error: accion.error } : estado;
    }
  }
};

/** Las reglas del monto del back (CargaRequest): mayor a 0, hasta $1.000.000,00 y con dos decimales. */
export const validarMonto = (texto: string): { monto: number } | { error: string } => {
  const normalizado = texto.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalizado))
    return { error: 'Ingresá un monto en pesos, por ejemplo 10000.' };
  if ((normalizado.split('.')[1] ?? '').length > 2) {
    return { error: 'El monto debe tener como máximo 2 decimales' };
  }
  const monto = Number(normalizado);
  if (monto <= 0) return { error: 'El monto debe ser mayor a cero' };
  if (monto > 1_000_000) return { error: 'El monto no puede superar $1.000.000,00' };
  return { monto };
};

/** Los wei en ETH con coma decimal y todos los decimales que tengan: 0,0001. */
export const eth = (wei: string | bigint) => formatEther(BigInt(wei)).replace('.', ',');
