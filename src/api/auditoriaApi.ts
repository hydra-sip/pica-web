import { httpClient } from './httpClient';
import { PageResponse } from './usuarioApi';

export type AccionAuditoria =
  | 'LOGIN'
  | 'LOGIN_FALLIDO'
  | 'LOGOUT'
  | 'ALTA'
  | 'MODIFICACION'
  | 'BAJA'
  | 'BLOQUEO'
  | 'DESBLOQUEO'
  | 'PAGO'
  | 'LAUDO'
  | 'SORTEO'
  | 'CIERRE_INSCRIPCION'
  | 'CIERRE_VENTA'
  | 'LIQUIDACION'
  | 'CANCELACION'
  | 'REINTEGRO';

/** GET /admin/auditoria: una fila del libro (HU-704). */
export interface RegistroAuditoria {
  id: number;
  fecha: string;
  /** Null en lo que hace el sistema (liquidaciones, cierres por fecha). */
  usuarioId: number | null;
  username: string | null;
  accion: AccionAuditoria;
  entidad: EntidadAuditoria | null;
  entidadId: string | null;
  /** El nombre de la entidad (el torneo, la rifa, el @usuario...); null si no se encuentra. */
  descripcion: string | null;
  /** Solo la guardan el login y el login fallido. */
  ip: string | null;
  detalle: Record<string, unknown> | null;
}

export type EntidadAuditoria =
  | 'TORNEO'
  | 'PARTIDO'
  | 'RIFA'
  | 'CUSTODIA'
  | 'BILLETERA'
  | 'CARGA_CRIPTO'
  | 'USUARIO'
  | 'PARAMETRO';

/**
 * Los filtros se combinan. `entidad` sin `entidadId` trae todas las de ese tipo; con TORNEO trae además lo suyo
 * (partidos, rifa y custodias). `desde` incluye ese instante y `hasta` no.
 */
export interface FiltrosAuditoria {
  entidad?: EntidadAuditoria;
  /** El id, o la clave si es un PARAMETRO. */
  entidadId?: string;
  usuario?: number;
  accion?: AccionAuditoria;
  desde?: string;
  hasta?: string;
}

export const auditoriaApi = {
  /** Del más nuevo al más viejo. */
  listar: async (
    filtros: FiltrosAuditoria,
    page = 0,
    size = 20
  ): Promise<PageResponse<RegistroAuditoria>> => {
    return httpClient.get<PageResponse<RegistroAuditoria>>('/admin/auditoria', {
      params: { ...filtros, page, size },
    });
  },

  /** Los ids de la entidad que tienen registros, para elegir en el filtro: hasta 200. */
  ids: async (entidad: EntidadAuditoria): Promise<string[]> => {
    return httpClient.get<string[]>('/admin/auditoria/ids', { params: { entidad } });
  },
};
