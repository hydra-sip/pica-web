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
  /** TORNEO, PARTIDO, RIFA, CUSTODIA, BILLETERA, CARGA_CRIPTO, USUARIO o PARAMETRO. */
  entidad: string | null;
  entidadId: string | null;
  /** Solo la guardan el login y el login fallido. */
  ip: string | null;
  detalle: Record<string, unknown> | null;
}

/** Los filtros se combinan. `desde` incluye ese instante y `hasta` no. */
export interface FiltrosAuditoria {
  torneo?: number;
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
};
