import { httpClient } from './httpClient';
import { PageResponse } from './usuarioApi';

export type EstadoBilletera = 'ACTIVA' | 'BLOQUEADA';

export interface Billetera {
  saldoDisponible: number;
  saldoRetenido: number;
  gananciaAcumulada: number;
  moneda: string;
  estado: EstadoBilletera;
}

export type TipoMovimientoBilletera =
  | 'CARGA'
  | 'INSCRIPCION'
  | 'COMPRA_NUMERO'
  | 'PREMIO'
  | 'REINTEGRO'
  | 'COMISION'
  | 'RETIRO'
  /** HU-604: el honorario que el organizador deposita en la custodia del torneo. */
  | 'PAGO_SERVICIO'
  /** HU-606: lo que la liquidación le acredita al organizador (gastos del torneo) y a la plataforma. */
  | 'LIQUIDACION'
  /** HU-604: lo que la liquidación le acredita al árbitro. */
  | 'HONORARIO';

export type EstadoMovimientoBilletera = 'PENDIENTE' | 'CONFIRMADO' | 'RECHAZADO' | 'REVERTIDO';

export interface TorneoMovimiento {
  id: number;
  nombre: string;
  titulo: string;
  slug: string | null;
}

export interface RifaMovimiento {
  id: number;
  titulo: string;
}

export interface MovimientoBilletera {
  id: number;
  tipo: TipoMovimientoBilletera;
  monto: number;
  moneda: string;
  saldoResultante: number;
  estado: EstadoMovimientoBilletera;
  referenciaExterna: string | null;
  descripcion: string | null;
  torneo?: TorneoMovimiento | null;
  rifa?: RifaMovimiento | null;
  creadoEn: string;
  /** HU-609: la transacción en BaseScan de una carga con cripto; null en el resto. */
  enlaceExplorador?: string | null;
}

export interface CargaRequest {
  monto: number;
  referencia?: string;
}

/**
 * HU-609: lo que hace falta para pagar una carga en el contrato PasarelaCargas. `montoWei` viene como texto
 * porque pasa el rango de enteros exactos de JavaScript: se usa como `bigint`.
 */
export interface CargaCripto {
  referencia: `0x${string}`;
  contrato: `0x${string}`;
  chainId: number;
  montoWei: string;
  montoPesos: number;
}

export type PaginaMovimientoBilletera = PageResponse<MovimientoBilletera>;

/**
 * Determina si un movimiento representa un ingreso de fondos (+).
 * Entran: CARGA, PREMIO, REINTEGRO, LIQUIDACION, HONORARIO.
 * Salen: INSCRIPCION, COMPRA_NUMERO, COMISION, RETIRO, PAGO_SERVICIO.
 */
export const esIngreso = (tipo: TipoMovimientoBilletera): boolean => {
  return (
    tipo === 'CARGA' ||
    tipo === 'PREMIO' ||
    tipo === 'REINTEGRO' ||
    tipo === 'LIQUIDACION' ||
    tipo === 'HONORARIO'
  );
};

export const TIPO_MOVIMIENTO_LABEL: Record<TipoMovimientoBilletera, string> = {
  CARGA: 'Carga de saldo',
  INSCRIPCION: 'Inscripción',
  COMPRA_NUMERO: 'Compra de números',
  PREMIO: 'Premio',
  REINTEGRO: 'Reintegro',
  COMISION: 'Gastos administrativos',
  RETIRO: 'Retiro',
  PAGO_SERVICIO: 'Pago de servicio',
  LIQUIDACION: 'Liquidación',
  HONORARIO: 'Honorario arbitral',
};

export const ESTADO_MOVIMIENTO_LABEL: Record<EstadoMovimientoBilletera, string> = {
  CONFIRMADO: 'Confirmado',
  PENDIENTE: 'Pendiente',
  RECHAZADO: 'Rechazado',
  REVERTIDO: 'Revertido',
};

export const billeteraApi = {
  /**
   * Obtiene los saldos (disponible, retenido, ganancia acumulada) y estado de la billetera del usuario.
   */
  obtener: async (): Promise<Billetera> => {
    return httpClient.get<Billetera>('/billetera');
  },

  obtenerBilletera: async (): Promise<Billetera> => {
    return httpClient.get<Billetera>('/billetera');
  },

  /**
   * Historial paginado de movimientos de la billetera del usuario, del más nuevo al más viejo.
   */
  listarMovimientos: async (params?: {
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PageResponse<MovimientoBilletera>> => {
    return httpClient.get<PageResponse<MovimientoBilletera>>('/billetera/movimientos', { params });
  },

  /**
   * Acredita una carga de saldo en la billetera virtual del usuario logueado.
   */
  /** HU-609: inicia una carga con cripto; el back fija la referencia y los wei con su cotización. */
  iniciarCargaCripto: async (monto: number): Promise<CargaCripto> => {
    return httpClient.post<CargaCripto>('/billetera/cargas/cripto', { monto });
  },

  /** HU-609: acredita la carga con el hash de la transacción que la pagó. 409 si todavía no se confirmó. */
  confirmarCargaCripto: async (referencia: string, hash: string): Promise<MovimientoBilletera> => {
    return httpClient.post<MovimientoBilletera>(`/billetera/cargas/cripto/${referencia}/confirmar`, {
      hash,
    });
  },

  cargarSaldo: async (monto: number, referencia?: string): Promise<MovimientoBilletera> => {
    const payload: CargaRequest = { monto, ...(referencia ? { referencia } : {}) };
    return httpClient.post<MovimientoBilletera>('/billetera/cargas', payload);
  },
};

