import { httpClient } from './httpClient';
import { PageResponse } from './usuarioApi';
import type { BadgeTone } from '../shared/ui';

export type ReglaFraude =
  | 'COMPRA_MASIVA_RIFA'
  | 'CARRUSEL_CARGA_RETIRO'
  | 'CANCELACIONES_REITERADAS'
  | 'OBJECIONES_ABUSIVAS'
  | 'CUENTAS_COMPARTIDAS';

export type EstadoAlertaFraude = 'PENDIENTE' | 'REVISADA';

export interface AlertaFraudeTorneo {
  id: number;
  nombre: string;
  slug?: string | null;
}

export interface AlertaFraudeRifa {
  id: number;
  titulo: string;
}

export interface AlertaFraudeUsuario {
  id: number;
  username: string;
  email: string;
}

export interface AlertaFraudeDetalle {
  id: number;
  regla: ReglaFraude;
  estado: EstadoAlertaFraude;
  motivo: string;
  datos: Record<string, unknown>;
  torneo: AlertaFraudeTorneo | null;
  rifa: AlertaFraudeRifa | null;
  usuario: AlertaFraudeUsuario;
  nota: string | null;
  revisadaPor: string | null;
  revisadaEn: string | null;
  creadaEn: string;
}

export interface FiltrosAlertaFraude {
  estado?: EstadoAlertaFraude;
  regla?: ReglaFraude;
  usuarioId?: number;
  torneoId?: number;
  rifaId?: number;
  desde?: string;
  hasta?: string;
}

export const REGLAS_FRAUDE: Record<ReglaFraude, string> = {
  COMPRA_MASIVA_RIFA: 'Compra masiva en rifa',
  CARRUSEL_CARGA_RETIRO: 'Carrusel carga/retiro',
  CANCELACIONES_REITERADAS: 'Cancelaciones reiteradas',
  OBJECIONES_ABUSIVAS: 'Objeciones abusivas',
  CUENTAS_COMPARTIDAS: 'Cuentas compartidas',
};

export const ESTADOS_ALERTA_FRAUDE: Record<EstadoAlertaFraude, { texto: string; tono: BadgeTone }> =
  {
    PENDIENTE: { texto: 'Pendiente', tono: 'peligro' },
    REVISADA: { texto: 'Revisada', tono: 'exito' },
  };

export const EVENTO_ALERTAS_ACTUALIZADAS = 'pica:alertas-actualizadas';

export const notificarAlertasActualizadas = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(EVENTO_ALERTAS_ACTUALIZADAS));
  }
};

export const alertaFraudeApi = {
  /** Listado paginado para soporte: PENDIENTE primero y luego del más nuevo al más viejo (HU-705). */
  listar: async (
    filtros: FiltrosAlertaFraude = {},
    page = 0,
    size = 20
  ): Promise<PageResponse<AlertaFraudeDetalle>> => {
    return httpClient.get<PageResponse<AlertaFraudeDetalle>>('/admin/alertas-fraude', {
      params: { ...filtros, page, size },
    });
  },

  /** Detalle completo con el JSON de evidencia de la regla disparada. */
  obtener: async (id: number): Promise<AlertaFraudeDetalle> => {
    return httpClient.get<AlertaFraudeDetalle>(`/admin/alertas-fraude/${id}`);
  },

  /** Marca como REVISADA con nota obligatoria y deja registro en la auditoría. */
  revisar: async (id: number, nota: string): Promise<AlertaFraudeDetalle> => {
    const actualizada = await httpClient.post<AlertaFraudeDetalle>(
      `/admin/alertas-fraude/${id}/revisar`,
      { nota }
    );
    notificarAlertasActualizadas();
    return actualizada;
  },
};
