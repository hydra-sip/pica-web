import { httpClient } from './httpClient';
import { PageResponse } from './usuarioApi';

export type EstadoRifa =
  'BORRADOR' | 'EN_VENTA' | 'CERRADA' | 'SORTEADA' | 'EN_REVISION' | 'LIQUIDADA' | 'CANCELADA';

/** Fila de GET /rifas/mis-rifas. */
export interface RifaResumen {
  id: number;
  titulo: string;
  /** El torneo para el que recauda (HU-401); null sin torneo. */
  torneoId: number | null;
  torneoNombre: string | null;
  estado: EstadoRifa;
  numeroDesde: number;
  numeroHasta: number;
  precioNumero: number;
  moneda: string;
  ventaDesde: string | null;
  ventaHasta: string | null;
  /** Fecha programada del sorteo; la aplicación sortea sola en esa fecha. */
  fechaSorteo: string | null;
  creadoEn: string;
}

export interface PremioRifa {
  puesto: number;
  /** Entero de 1 a 100. */
  pct: number;
  descripcion: string | null;
  /** Número que ganó el premio; null hasta el sorteo. */
  numeroGanador: number | null;
}

/** GET /rifas/{id}; también lo devuelven el alta, la edición, el reemplazo de premios y publicar. */
export interface RifaDetalle extends RifaResumen {
  descripcion: string | null;
  /** % de lo recaudado que va al pozo del torneo; no es un premio. Sin torneo, 0. */
  pctDestinadoTorneo: number;
  terminosAceptadosEn: string | null;
  loteriaDeclaradaEn: string | null;
  premios: PremioRifa[];
  modificadoEn: string | null;
}

/** Datos generales (paso 1). Las fechas van en ISO-8601 UTC o null. */
export interface RifaPayload {
  titulo: string;
  descripcion?: string | null;
  numeroDesde: number;
  numeroHasta: number;
  precioNumero: number;
  ventaDesde: string | null;
  ventaHasta: string | null;
  fechaSorteo: string | null;
  /** Un torneo propio en borrador o publicado sin empezar; null sin torneo. */
  torneoId: number | null;
  /** Entero de 0 a 99; sin torneo, 0. */
  pctDestinadoTorneo: number;
}

/** Un premio del paso 2; el puesto es la posición en la lista. */
export interface PremioPayload {
  pct: number;
  descripcion?: string | null;
}

/** Lo que le falta a una rifa para publicarse (`faltantes` del 409 RIFA_INCOMPLETA). */
export type FaltantePublicacion =
  | 'VENTANA'
  | 'VENTA_YA_EMPEZO'
  | 'FECHA_SORTEO'
  | 'SIN_PREMIOS'
  | 'PREMIOS_NO_SUMAN_100'
  | 'TORNEO_NO_PUBLICADO'
  | 'VENTANA_FUERA_DEL_TORNEO';

// PICA-226, PICA-227, PICA-219, PICA-218: todas exigen RIFA_GESTIONAR y cada organizador ve solo las suyas.
export const rifaApi = {
  listarMias: async (params?: {
    page?: number;
    size?: number;
  }): Promise<PageResponse<RifaResumen>> => {
    return httpClient.get<PageResponse<RifaResumen>>('/rifas/mis-rifas', { params });
  },

  obtener: async (id: number): Promise<RifaDetalle> => {
    return httpClient.get<RifaDetalle>(`/rifas/${id}`);
  },

  crear: async (payload: RifaPayload): Promise<RifaDetalle> => {
    return httpClient.post<RifaDetalle>('/rifas', payload);
  },

  actualizar: async (id: number, payload: RifaPayload): Promise<RifaDetalle> => {
    return httpClient.put<RifaDetalle>(`/rifas/${id}`, payload);
  },

  reemplazarPremios: async (id: number, premios: PremioPayload[]): Promise<RifaDetalle> => {
    return httpClient.put<RifaDetalle>(`/rifas/${id}/premios`, { premios });
  },

  /** Pasa la rifa a EN_VENTA; 409 RIFA_INCOMPLETA con `faltantes` si le falta algo. */
  publicar: async (id: number): Promise<RifaDetalle> => {
    return httpClient.post<RifaDetalle>(`/rifas/${id}/publicar`, {
      aceptaTerminos: true,
      declaraAutorizacionLoteria: true,
    });
  },
};

// --- Para quien compra (HU-403, PICA-221): públicas, sin login ------------------------------------

/** Fila de GET /rifas/publicas: en venta y con la venta sin terminar. */
export interface RifaPublicaResumen {
  id: number;
  titulo: string;
  torneoNombre: string | null;
  numeroDesde: number;
  numeroHasta: number;
  precioNumero: number;
  moneda: string;
  /** Si es futura, la venta todavía no empezó. */
  ventaDesde: string;
  ventaHasta: string;
  fechaSorteo: string;
}

/** GET /rifas/publicas/{id}: sin datos del organizador ni de los compradores. */
export interface RifaPublicaDetalle {
  id: number;
  titulo: string;
  descripcion: string | null;
  estado: EstadoRifa;
  /** El slug lleva a la ficha pública del torneo; null sin torneo. */
  torneo: { id: number; nombre: string; slug: string | null } | null;
  pctDestinadoTorneo: number;
  numeroDesde: number;
  numeroHasta: number;
  precioNumero: number;
  /** Lo que paga aparte el comprador, fijado al publicar. */
  pctGastosAdministrativos: number | null;
  moneda: string;
  ventaDesde: string;
  ventaHasta: string;
  fechaSorteo: string;
  premios: PremioRifa[];
}

export type EstadoNumero = 'VENDIDO' | 'RESERVADO' | 'REINTEGRADO';

/** Un número de la grilla que no se puede elegir; los demás del rango están libres. */
export interface NumeroOcupado {
  numero: number;
  estado: EstadoNumero;
}

export const rifaPublicaApi = {
  enVenta: async (params?: {
    page?: number;
    size?: number;
  }): Promise<PageResponse<RifaPublicaResumen>> => {
    return httpClient.get<PageResponse<RifaPublicaResumen>>('/rifas/publicas', { params });
  },

  obtener: async (id: number): Promise<RifaPublicaDetalle> => {
    return httpClient.get<RifaPublicaDetalle>(`/rifas/publicas/${id}`);
  },

  numerosOcupados: async (id: number): Promise<NumeroOcupado[]> => {
    return httpClient.get<NumeroOcupado[]>(`/rifas/publicas/${id}/numeros`);
  },
};

// --- La compra (HU-403, PICA-222): con sesión ------------------------------------------------------

/** POST /rifas/{id}/reservas: los números quedan del comprador hasta `venceEn` mientras paga. */
export interface ReservaRifa {
  rifaId: number;
  numeros: number[];
  precioNumero: number;
  /** El precio de los números; va al pozo de la rifa. */
  monto: number;
  pctGastosAdministrativos: number | null;
  gastosAdministrativos: number;
  total: number;
  venceEn: string;
}

/** El comprobante de POST /rifas/{id}/comprar. */
export interface CompraRifa {
  ticketId: number;
  ticketCodigo: string;
  numeros: number[];
  monto: number;
  gastosAdministrativos: number;
  total: number;
  compradoEn: string;
  pozoRifa: number;
  pozoTorneo: number | null;
}

export const ventaRifaApi = {
  reservar: async (rifaId: number, numeros: number[]): Promise<ReservaRifa> => {
    return httpClient.post<ReservaRifa>(`/rifas/${rifaId}/reservas`, { numeros });
  },

  cancelarReserva: async (rifaId: number): Promise<void> => {
    await httpClient.delete(`/rifas/${rifaId}/reservas`);
  },

  /** Con la misma `clave` devuelve el mismo comprobante sin volver a cobrar. */
  comprar: async (rifaId: number, numeros: number[], clave: string): Promise<CompraRifa> => {
    return httpClient.post<CompraRifa>(
      `/rifas/${rifaId}/comprar`,
      { numeros },
      { headers: { 'Idempotency-Key': clave } }
    );
  },
};
