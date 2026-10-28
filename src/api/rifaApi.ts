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

export type EstadoReclamo = 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO';

export interface ReclamoRifa {
  id: number;
  rifaId: number;
  usuarioId: number;
  usuarioNombre?: string;
  ticketId?: number | null;
  motivo: string;
  estado: EstadoReclamo;
  resolucion?: string | null;
  resueltoEn?: string | null;
  resueltoPor?: string | null;
  creadoEn: string;
}

export interface ReclamoPayload {
  motivo: string;
  ticketId?: number;
}

export interface TicketDetalle {
  id: number;
  codigo: string;
  rifaId: number;
  rifaTitulo: string;
  torneoId?: number | null;
  torneoNombre?: string | null;
  compradorId: number;
  compradorNombre: string;
  compradorUsername?: string;
  numeros: number[];
  monto: number;
  comision: number;
  moneda: string;
  creadoEn: string;
  rifaEstado: EstadoRifa;
  sorteadaEn: string | null;
  reclamo?: ReclamoRifa | null;
  esComprador: boolean;
  ventanaReclamoAbierta: boolean;
  horasRestantesParaReclamar?: number | null;
}

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

  /** HU-506 (PICA-268 / PICA-269): Reclamar resultado del sorteo de una rifa. */
  reclamar: async (rifaId: number, payload: ReclamoPayload): Promise<ReclamoRifa> => {
    return httpClient.post<ReclamoRifa>(`/rifas/${rifaId}/reclamos`, payload);
  },

  /** Obtener el detalle de un ticket de rifa. */
  obtenerTicket: async (ticketId: number | string): Promise<TicketDetalle> => {
    return httpClient.get<TicketDetalle>(`/tickets/${ticketId}`);
  },

  /** Obtener los reclamos asociados a una rifa. */
  obtenerReclamos: async (rifaId: number): Promise<ReclamoRifa[]> => {
    return httpClient.get<ReclamoRifa[]>(`/rifas/${rifaId}/reclamos`);
  },

  /** Listar los tickets del usuario logueado. */
  misTickets: async (): Promise<TicketDetalle[]> => {
    return httpClient.get<TicketDetalle[]>('/tickets/mis-tickets');
  },
};

