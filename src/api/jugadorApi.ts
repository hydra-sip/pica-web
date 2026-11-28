import { httpClient } from './httpClient';
import { PageResponse } from './usuarioApi';

/** Lo que cualquier usuario logueado puede ver de otro, sin datos personales. */
export interface UsuarioPublico {
  id: number;
  username: string;
  nombres: string;
  apellidos: string;
}

/** Un torneo terminado del jugador. `posicion` null: quedó afuera en la fase de grupos. */
export interface TorneoDelJugador {
  torneoId: number;
  /** null si el torneo ya no tiene ficha pública. */
  slug: string | null;
  nombre: string;
  disciplina: string;
  /** La planificada; null si el torneo no la tiene. */
  fechaFin: string | null;
  posicion: number | null;
  /** Con qué equipo jugó; null en un torneo individual. */
  equipo: string | null;
}

/** HU-804: un premio de rifa que ganó. */
export interface RifaGanada {
  rifaId: number;
  rifaTitulo: string;
  /** null si la rifa no está asociada a un torneo. */
  torneoId: number | null;
  torneoNombre: string | null;
  torneoSlug: string | null;
  puesto: number;
  numeroGanador: number | null;
  fecha: string | null;
}

/** HU-804: `icono` es una clave, no una URL. */
export interface Insignia {
  codigo: string;
  nombre: string;
  descripcion: string;
  icono: string;
  otorgadaEn: string;
}

/** GET /usuarios/{id}/perfil (HU-801): lo que cualquiera, sin sesión, ve de un jugador. */
export interface PerfilJugador {
  id: number;
  username: string;
  nombreCompleto: string;
  /** Por ahora siempre null. */
  avatar: string | null;
  historial: { torneosJugados: number; victorias: number; derrotas: number; podios: number };
  /** `actualizadoEn` null: el índice nunca se movió. */
  fairPlay: { valor: number; actualizadoEn: string | null };
  /** Los últimos terminados, el más reciente primero. */
  ultimosTorneos: TorneoDelJugador[];
  rifasGanadas: RifaGanada[];
  insignias: Insignia[];
}

// Para cargar la nómina y ver el perfil de otro. Sin permiso especial, solo usuarios activos, sin email ni documento.
export const jugadorApi = {
  /**
   * GET /usuarios?q=. Cada palabra de `q` tiene que estar en el username, los nombres o los apellidos.
   * El back responde 400 VALIDACION si `q` tiene menos de 3 caracteres sin contar los espacios de los costados.
   */
  buscar: async (
    q: string,
    params?: { page?: number; size?: number }
  ): Promise<PageResponse<UsuarioPublico>> => {
    return httpClient.get<PageResponse<UsuarioPublico>>('/usuarios', { params: { q, ...params } });
  },

  /** GET /usuarios/{id}/perfil: público. 404 USUARIO_NO_ENCONTRADO si no existe. */
  verPerfil: async (id: number): Promise<PerfilJugador> => {
    return httpClient.get<PerfilJugador>(`/usuarios/${id}/perfil`);
  },
};
