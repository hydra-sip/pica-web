import { httpClient } from './httpClient';
import { EstadoReclamo, EstadoRifa } from './rifaApi';
import { PageResponse } from './usuarioApi';

export type { EstadoReclamo };

/** Decisión de resolución en el backoffice (HU-706): SIN_FRAUDE → RECHAZADO; FRAUDE_CONFIRMADO → ACEPTADO. */
export type DecisionReclamo = 'SIN_FRAUDE' | 'FRAUDE_CONFIRMADO';

/** Resumen y detalle de reclamo en el admin (GET /admin/reclamos y GET /admin/reclamos/{id}). */
export interface ReclamoAdminResumen {
  id: number;
  motivo: string;
  estado: EstadoReclamo;
  resolucion: string | null;
  resueltoEn: string | null;
  resueltoPor: string | null;
  fondosLiberadosEn: string | null;
  fondosLiberadosPor: string | null;
  fondosLiberadosMonto: number | null;
  creadoEn: string;
  rifa: {
    id: number;
    titulo: string;
    estado: EstadoRifa;
    torneoNombre: string | null;
    fechaSorteo: string | null;
    semillaObtenidaEn: string | null;
  };
  reclamante: {
    id: number;
    username: string;
    email: string;
  };
}

export interface ResolverReclamoPayload {
  decision: DecisionReclamo;
  resolucion: string;
}

export const reclamoAdminApi = {
  /** Listado paginado de reclamos, ordenado primero los PENDIENTE. */
  listar: async (params?: {
    estado?: EstadoReclamo | '';
    page?: number;
    size?: number;
  }): Promise<PageResponse<ReclamoAdminResumen>> => {
    return httpClient.get<PageResponse<ReclamoAdminResumen>>('/admin/reclamos', { params });
  },

  /** Detalle de un reclamo; 404 RECLAMO_NO_ENCONTRADO si no existe. */
  obtener: async (id: number): Promise<ReclamoAdminResumen> => {
    return httpClient.get<ReclamoAdminResumen>(`/admin/reclamos/${id}`);
  },

  /** Resuelve un reclamo pendiente (permiso RECLAMO_RESOLVER). */
  resolver: async (
    id: number,
    payload: ResolverReclamoPayload
  ): Promise<ReclamoAdminResumen> => {
    return httpClient.post<ReclamoAdminResumen>(`/admin/reclamos/${id}/resolucion`, payload);
  },

  /** Libera los fondos congelados de un reclamo ya resuelto (HU-707, permiso RECLAMO_RESOLVER). */
  liberarFondos: async (id: number): Promise<ReclamoAdminResumen> => {
    return httpClient.post<ReclamoAdminResumen>(`/admin/reclamos/${id}/liberar`);
  },
};

