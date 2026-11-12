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

/** HU-607: Cuentas bancarias y retiros */
export type TipoCuenta = 'CBU' | 'CVU' | 'ALIAS';

export type EstadoValidacionCuenta = 'PENDIENTE' | 'VALIDADA' | 'RECHAZADA';

export interface CuentaBancaria {
  id: number;
  tipo: TipoCuenta;
  valor: string;
  titular: string;
  cuitCuil: string;
  estadoValidacion: EstadoValidacionCuenta;
  validadaEn: string | null;
  creadoEn: string;
}

export interface CrearCuentaBancariaRequest {
  tipo: TipoCuenta;
  valor: string;
  titular: string;
  cuitCuil: string;
}

export interface LimitesRetiro {
  minimo: number;
  maximo: number;
}

export interface SolicitarRetiroRequest {
  cuentaId: number;
  monto: number;
}

/**
 * Devuelve la etiqueta legible de un movimiento, contextualizando según su tipo y estado.
 * En particular, para retiros en proceso (RETIRO + PENDIENTE) muestra "En proceso" (HU-607).
 */
export const estadoMovimientoLabel = (movimiento: MovimientoBilletera): string => {
  if (movimiento.tipo === 'RETIRO' && movimiento.estado === 'PENDIENTE') {
    return 'En proceso';
  }
  return ESTADO_MOVIMIENTO_LABEL[movimiento.estado] || movimiento.estado;
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

  /**
   * HU-607: Listar cuentas bancarias del usuario autenticado.
   */
  listarCuentas: async (): Promise<CuentaBancaria[]> => {
    return httpClient.get<CuentaBancaria[]>('/billetera/cuentas');
  },

  /**
   * HU-607: Registrar y validar una nueva cuenta bancaria para retiros.
   */
  crearCuenta: async (data: CrearCuentaBancariaRequest): Promise<CuentaBancaria> => {
    return httpClient.post<CuentaBancaria>('/billetera/cuentas', data);
  },

  /**
   * HU-607: Dar de baja lógica una cuenta bancaria del usuario.
   */
  eliminarCuenta: async (id: number): Promise<void> => {
    return httpClient.delete<void>(`/billetera/cuentas/${id}`);
  },

  /**
   * HU-607: Obtener los topes mínimo y máximo parametrizados para retiros de fondos.
   */
  obtenerLimitesRetiro: async (): Promise<LimitesRetiro> => {
    return httpClient.get<LimitesRetiro>('/billetera/retiros/limites');
  },

  /**
   * HU-607: Solicitar un retiro hacia una cuenta bancaria validada.
   */
  solicitarRetiro: async (data: SolicitarRetiroRequest): Promise<MovimientoBilletera> => {
    return httpClient.post<MovimientoBilletera>('/billetera/retiros', data);
  },
};

