import { httpClient } from './httpClient';
import { PageResponse } from './usuarioApi';
import {
  FiltrosTorneo,
  PageResponse as PaginaTorneos,
  TorneoDetalle,
  TorneoResumen,
} from '../torneos/types/torneo';

export type EstadoTorneo =
  | 'BORRADOR'
  | 'INSCRIPCION_ABIERTA'
  | 'INSCRIPCION_CERRADA'
  | 'EN_CURSO'
  | 'FINALIZADO'
  | 'CANCELADO';
export type Formato = 'ELIMINACION_DIRECTA';
export type Modalidad = 'PRESENCIAL' | 'ONLINE';
export type TipoParticipante = 'INDIVIDUAL' | 'EQUIPO';

/** Pasos 1 y 2 del asistente. Se manda todo cada vez: lo que va en null queda vacío. Fechas en ISO UTC. */
export interface InformacionTorneoPayload {
  nombre: string;
  disciplina: string;
  descripcion?: string | null;
  formato?: Formato | null;
  modalidad: Modalidad | null;
  tipoParticipante: TipoParticipante | null;
  sede: string | null;
  canchas: string[];
  fechaInicio: string | null;
  fechaFin: string | null;
  cierreInscripcionEn: string | null;
  reglamentoTexto: string | null;
  cupoMaximo: number | null;
  cupoMinimo: number | null;
  tamanioEquipo: number | null;
  nominaMaxima: number | null;
}

/** GET /torneos/{id}; también lo devuelven el alta y PUT /informacion. */
export interface TorneoInformacion extends Omit<
  InformacionTorneoPayload,
  'descripcion' | 'formato'
> {
  id: number;
  estado: EstadoTorneo;
  /** En BORRADOR, el paso (1 a 3) donde reabrir el asistente; si no, null. */
  pasoPendiente: number | null;
  descripcion: string | null;
  formato: Formato;
  /** El PDF, si se subió. */
  reglamentoUrl: string | null;
  creadoEn: string;
  modificadoEn: string;
}

export interface DisciplinaOpcion {
  nombre: string;
  tipoParticipante: TipoParticipante;
  modalidad: Modalidad;
  tamanioEquipo: number | null;
  nominaMaxima: number | null;
  reglas: string;
}

export interface FormatoOpcion {
  codigo: string;
  nombre: string;
  /** false: se muestra como "próximamente". */
  disponible: boolean;
}

/** GET /torneos/opciones. Las disciplinas son sugerencias: se puede escribir otra. */
export interface OpcionesTorneo {
  disciplinas: DisciplinaOpcion[];
  formatos: FormatoOpcion[];
  modalidades: Modalidad[];
  /** Máximo de participantes que admite la plataforma. */
  cupoMaximo: number;
  /** Las que ya existen en la sede pedida. */
  canchas: string[];
}

/** Fila de GET /torneos/mis-torneos. */
export interface MiTorneoResumen {
  id: number;
  nombre: string;
  disciplina: string;
  estado: EstadoTorneo;
  pasoPendiente: number | null;
  sede: string | null;
  cupoMaximo: number | null;
  /** Inscripciones confirmadas. */
  inscriptos: number;
  /** Lo que va al pozo de competidores; null sin parte económica. */
  pozo: number | null;
  /** true en BORRADOR: calculado con el cupo completo. */
  pozoEstimado: boolean;
  moneda: string;
  fechaInicio: string | null;
  modificadoEn: string;
}

export interface MisTorneos extends PageResponse<MiTorneoResumen> {
  /** Cantidad en cada estado con la búsqueda y la disciplina, sin el filtro de estado. */
  porEstado: Record<EstadoTorneo, number>;
  disciplinas: string[];
}

// Las del asistente exigen TORNEO_GESTIONAR y cada organizador ve solo los suyos; las del catálogo son públicas.
export const torneoApi = {
  opciones: async (sede?: string): Promise<OpcionesTorneo> => {
    return httpClient.get<OpcionesTorneo>('/torneos/opciones', { params: { sede } });
  },

  misTorneos: async (params: {
    q?: string;
    estado?: EstadoTorneo;
    disciplina?: string;
    page?: number;
    size?: number;
  }): Promise<MisTorneos> => {
    return httpClient.get<MisTorneos>('/torneos/mis-torneos', { params });
  },

  obtener: async (id: number): Promise<TorneoInformacion> => {
    return httpClient.get<TorneoInformacion>(`/torneos/${id}`);
  },

  crear: async (payload: InformacionTorneoPayload): Promise<TorneoInformacion> => {
    return httpClient.post<TorneoInformacion>('/torneos', payload);
  },

  actualizarInformacion: async (
    id: number,
    payload: InformacionTorneoPayload
  ): Promise<TorneoInformacion> => {
    return httpClient.put<TorneoInformacion>(`/torneos/${id}/informacion`, payload);
  },

  /**
   * Obtiene la lista paginada de torneos públicos con filtros opcionales.
   * Endpoint público (no requiere token de autenticación).
   */
  getTorneosResumen: async (filtros: FiltrosTorneo = {}): Promise<PaginaTorneos<TorneoResumen>> => {
    const params: Record<string, string | number | undefined> = {};

    if (filtros.disciplina && filtros.disciplina.trim() !== '') {
      params.disciplina = filtros.disciplina.trim();
    }

    if (filtros.estado && filtros.estado.trim() !== '') {
      params.estado = filtros.estado.trim();
    }

    if (typeof filtros.page === 'number') {
      params.page = filtros.page;
    }

    if (typeof filtros.size === 'number') {
      params.size = filtros.size;
    }

    if (filtros.sort && filtros.sort.trim() !== '') {
      params.sort = filtros.sort.trim();
    }

    return httpClient.get<PaginaTorneos<TorneoResumen>>('/torneos/resumen', {
      params,
    });
  },

  /**
   * Obtiene el detalle público de un torneo por su slug identificador.
   * Endpoint público (no requiere token de autenticación).
   */
  getTorneoBySlug: async (slug: string): Promise<TorneoDetalle> => {
    return httpClient.get<TorneoDetalle>(`/torneos/slug/${encodeURIComponent(slug)}`);
  },
};
