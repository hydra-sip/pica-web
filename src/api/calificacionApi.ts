import { httpClient } from './httpClient';
import { UsuarioPublico } from './jugadorApi';

/** POST /torneos/{id}/calificaciones (HU-805): de 1 a 5, comentario opcional y la marca de no confiable. */
export interface CalificacionRequest {
  usuarioId: number;
  puntaje: number;
  comentario?: string | null;
  noConfiable: boolean;
}

export interface CalificacionDetalle {
  id: number;
  torneoId: number;
  torneo: string;
  jugador: UsuarioPublico;
  organizador: UsuarioPublico;
  puntaje: number;
  comentario: string | null;
  noConfiable: boolean;
  creadaEn: string;
}

/** GET /torneos/{id}/calificaciones: un jugador del torneo terminado, con su calificación si ya la tiene. */
export interface JugadorCalificable {
  inscripcionId: number;
  /** Null si la inscripción es individual. */
  equipo: string | null;
  jugador: UsuarioPublico;
  calificacion: CalificacionDetalle | null;
}

/** El promedio de las calificaciones que recibió un jugador; sin calificaciones, promedio null. */
export interface Reputacion {
  promedio: number | null;
  cantidad: number;
}

export const calificacionApi = {
  /** Solo el organizador, con el torneo terminado; 409 JUGADOR_YA_CALIFICADO si ya lo calificó en este torneo. */
  calificar: async (
    torneoId: number,
    request: CalificacionRequest
  ): Promise<CalificacionDetalle> => {
    return httpClient.post<CalificacionDetalle>(`/torneos/${torneoId}/calificaciones`, request);
  },

  /** Los jugadores del torneo terminado, por inscripción. */
  jugadores: async (torneoId: number): Promise<JugadorCalificable[]> => {
    return httpClient.get<JugadorCalificable[]>(`/torneos/${torneoId}/calificaciones`);
  },
};
