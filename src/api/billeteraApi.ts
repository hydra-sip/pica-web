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
  | 'PAGO_SERVICIO';

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
}

export interface CargaRequest {
  monto: number;
  referencia?: string;
}

export type PaginaMovimientoBilletera = PageResponse<MovimientoBilletera>;

/**
 * Determina si un movimiento representa un ingreso de fondos (+).
 * Entran: CARGA, PREMIO, REINTEGRO.
 * Salen: INSCRIPCION, COMPRA_NUMERO, COMISION, RETIRO, PAGO_SERVICIO.
 */
export const esIngreso = (tipo: TipoMovimientoBilletera): boolean => {
  return tipo === 'CARGA' || tipo === 'PREMIO' || tipo === 'REINTEGRO';
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
  cargarSaldo: async (monto: number, referencia?: string): Promise<MovimientoBilletera> => {
    const payload: CargaRequest = { monto, ...(referencia ? { referencia } : {}) };
    return httpClient.post<MovimientoBilletera>('/billetera/cargas', payload);
  },
};

