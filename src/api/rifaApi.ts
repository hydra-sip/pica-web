import { httpClient } from './httpClient';
import { PageResponse } from './usuarioApi';

export type EstadoRifa =
  'BORRADOR' | 'EN_VENTA' | 'CERRADA' | 'SORTEADA' | 'EN_REVISION' | 'LIQUIDADA' | 'CANCELADA';

/** Fila de GET /rifas/mis-rifas. */
export interface RifaResumen {
  id: number;
  titulo: string;
  estado: EstadoRifa;
  numeroDesde: number;
  numeroHasta: number;
  precioNumero: number;
  moneda: string;
  ventaDesde: string | null;
  ventaHasta: string | null;
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

/** GET /rifas/{id}; también lo devuelven el alta, la edición y el reemplazo de premios. */
export interface RifaDetalle extends RifaResumen {
  descripcion: string | null;
  terminosAceptadosEn: string | null;
  premios: PremioRifa[];
  modificadoEn: string | null;
}

/** Datos generales (pestaña 1). Las fechas van en ISO-8601 UTC o null. */
export interface RifaPayload {
  titulo: string;
  descripcion?: string | null;
  numeroDesde: number;
  numeroHasta: number;
  precioNumero: number;
  ventaDesde: string | null;
  ventaHasta: string | null;
}

/** Un premio de la pestaña 2; el puesto es la posición en la lista. */
export interface PremioPayload {
  pct: number;
  descripcion?: string | null;
}

// PICA-226 / PICA-227: todas exigen RIFA_GESTIONAR y cada organizador ve solo las suyas.
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
};
