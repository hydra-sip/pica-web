import { httpClient } from './httpClient';
import { PageResponse } from './usuarioApi';

/** Los eventos de HU-808 que le llegan a un usuario. */
export type TipoNotificacion = 'RIVAL_ASIGNADO' | 'CHECKIN_ABIERTO' | 'CRUCE_INICIADO' | 'RECLAMO_RESUELTO';

/** GET /me/notificaciones y lo que llega por WebSocket a /user/queue/notificaciones (HU-808). */
export interface Notificacion {
  id: number;
  tipo: TipoNotificacion;
  titulo: string;
  cuerpo: string;
  /** Ruta del front sin dominio (/partidos/15, /rifas/3, /billetera); null si no lleva a ningún lado. */
  enlace: string | null;
  /** Lo propio de cada tipo: partidoId, torneoId, cierraEn, rifaId, monto... */
  datos: Record<string, unknown>;
  leidaEn: string | null;
  creadaEn: string;
}

/** Lo dispara el centro o el aviso al marcar una leída, para que la campana vuelva a pedir el contador. */
export const EVENTO_NOTIFICACIONES_LEIDAS = 'pica:notificaciones-leidas';

export const notificacionApi = {
  /** De la más nueva a la más vieja. Sin {@code leida}, todas; con false, las que faltan leer; con true, las leídas. */
  listar: async (leida: boolean | undefined, page = 0, size = 20): Promise<PageResponse<Notificacion>> => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (leida !== undefined) params.set('leida', String(leida));
    return httpClient.get<PageResponse<Notificacion>>(`/me/notificaciones?${params.toString()}`);
  },

  /** El contador de la campana: el total de las no leídas, pidiendo una sola. */
  noLeidas: async (): Promise<number> => {
    const pagina = await notificacionApi.listar(false, 0, 1);
    return pagina.page?.totalElements ?? pagina.content.length;
  },

  marcarLeida: async (id: number): Promise<void> => {
    await httpClient.post<void>(`/me/notificaciones/${id}/leida`);
  },

  marcarTodas: async (): Promise<void> => {
    await httpClient.post<void>('/me/notificaciones/leidas');
  },
};
