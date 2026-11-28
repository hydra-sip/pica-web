import { httpClient } from './httpClient';
import { UsuarioPublico } from './jugadorApi';

/** HU-803: cuánto le baja al índice de fair play lo definen los parámetros FAIR_PLAY_SANCION_*. */
export type Gravedad = 'LEVE' | 'MEDIA' | 'GRAVE';

/** POST /torneos/{id}/sanciones. El partido es opcional; si viene, tiene que ser del torneo y del jugador. */
export interface SancionRequest {
  usuarioId: number;
  partidoId?: number | null;
  gravedad: Gravedad;
  motivo: string;
}

export interface SancionDetalle {
  id: number;
  torneoId: number;
  torneo: string;
  jugador: UsuarioPublico;
  partidoId: number | null;
  gravedad: Gravedad;
  motivo: string;
  aplicadaPor: UsuarioPublico;
  aplicadaEn: string;
  anuladaEn: string | null;
}

/** GET /torneos/{id}/sanciones/jugadores: el inscripto individual o uno de la nómina de un equipo confirmado. */
export interface JugadorSancionable {
  inscripcionId: number;
  /** Null si la inscripción es individual. */
  equipo: string | null;
  jugador: UsuarioPublico;
}

export const sancionApi = {
  /** El organizador o un árbitro que aceptó; 409 JUGADOR_NO_PARTICIPA si no está en una inscripción confirmada. */
  aplicar: async (torneoId: number, request: SancionRequest): Promise<SancionDetalle> => {
    return httpClient.post<SancionDetalle>(`/torneos/${torneoId}/sanciones`, request);
  },

  /** Las del torneo, la más reciente primero. */
  delTorneo: async (torneoId: number): Promise<SancionDetalle[]> => {
    return httpClient.get<SancionDetalle[]>(`/torneos/${torneoId}/sanciones`);
  },

  /** Las que recibió quien consulta, en todos los torneos. */
  mias: async (): Promise<SancionDetalle[]> => {
    return httpClient.get<SancionDetalle[]>('/sanciones/mias');
  },

  /** A quiénes puede sancionar quien consulta; con partido, solo a los de ese partido. */
  jugadores: async (torneoId: number, partidoId?: number): Promise<JugadorSancionable[]> => {
    return httpClient.get<JugadorSancionable[]>(`/torneos/${torneoId}/sanciones/jugadores`, {
      params: partidoId ? { partidoId } : undefined,
    });
  },
};
