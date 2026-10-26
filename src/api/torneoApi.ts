import { customFetch, httpClient } from './httpClient';
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
  /** El PDF, si se subió: GET /torneos/{id}/reglamento. */
  reglamentoUrl: string | null;
  /** SHA-256 del PDF desde que se sube; sin PDF, el del texto al publicar. */
  reglamentoHash: string | null;
  /** El paso 3, con lo que falta en null. */
  economia: EconomiaTorneo;
  /** El enlace público; se genera al publicar. */
  slug: string | null;
  /** SHA-256 del esquema económico, sellado al publicar. */
  esquemaHash: string | null;
  publicadoEn: string | null;
  creadoEn: string;
  modificadoEn: string;
  /**
   * Los campos de los pasos 1 y 2 que ya no se pueden cambiar (HU-202): vacío en BORRADOR; publicado, según las
   * inscripciones pagas; en curso o después, todos.
   */
  camposBloqueados: CampoTorneo[];
}

/** Un campo de PUT /torneos/{id}/informacion. */
export type CampoTorneo = keyof InformacionTorneoPayload;

export interface PremioPuesto {
  puesto: number;
  pct: number;
}

/**
 * Paso 3. La bolsa se reparte en pozo de competidores, premio de la rifa y comisión, que suman 100; los premios
 * reparten el pozo de competidores menos los gastos.
 */
export interface EconomiaTorneo {
  valorInscripcion: number | null;
  moneda: string;
  pctPozoCompetidores: number | null;
  pctPremioRifa: number | null;
  /** El resto hasta 100; null sin los otros dos. */
  pctComision: number | null;
  premios: PremioPuesto[];
}

/** PUT /torneos/{id}/economia: los premios, en orden de puesto. */
export interface EconomiaTorneoPayload {
  valorInscripcion: number;
  pctPozoCompetidores: number;
  pctPremioRifa: number;
  pctComision: number;
  premios: number[];
}

export interface GastoDetalle {
  gastoId: number;
  descripcion: string;
  monto: number;
}

export interface GastoPayload {
  descripcion: string;
  monto: number;
}

/** GET /torneos/{id}/resumen-economico: las cuentas del paso 3 con el cupo completo. */
export interface ResumenEconomico {
  participantes: number | null;
  valorInscripcion: number | null;
  moneda: string;
  recaudacion: number | null;
  comision: number | null;
  premioRifa: number | null;
  pozoCompetidores: number | null;
  gastos: number;
  pozoNeto: number | null;
  premios: { puesto: number; pct: number; monto: number | null }[];
}

/** Lo que le falta a un torneo para publicarse (`faltantes` del 409 TORNEO_INCOMPLETO). */
export type FaltanteTorneo =
  | 'INFORMACION'
  | 'CUPOS'
  | 'ECONOMIA'
  | 'SIN_PREMIOS'
  | 'PREMIOS_NO_SUMAN_100'
  | 'POZO_NETO_NO_POSITIVO'
  | 'CIERRE_VENCIDO';

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
  /** Tope del % de comisión de la plataforma en el paso 3. */
  comisionMaxima: number;
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

/** Lo que el organizador delega en cada árbitro (HU-203). */
export type PermisoArbitro = 'CARGAR_RESULTADOS' | 'RESOLVER_OBJECIONES';
/** Nace PENDIENTE; el árbitro la acepta o la rechaza (HU-807). Solo uno aceptado arbitra. */
export type EstadoDesignacion = 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO';

/** GET /torneos/{id}/arbitros. */
export interface ArbitroDetalle {
  usuarioId: number;
  username: string;
  nombres: string;
  apellidos: string;
  estado: EstadoDesignacion;
  permisos: PermisoArbitro[];
  designadoEn: string;
}

/** Un resultado del buscador de árbitros (GET /arbitros). */
export interface ArbitroOpcion {
  id: number;
  username: string;
  nombres: string;
  apellidos: string;
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

  actualizarEconomia: async (
    id: number,
    payload: EconomiaTorneoPayload
  ): Promise<TorneoInformacion> => {
    return httpClient.put<TorneoInformacion>(`/torneos/${id}/economia`, payload);
  },

  resumenEconomico: async (id: number): Promise<ResumenEconomico> => {
    return httpClient.get<ResumenEconomico>(`/torneos/${id}/resumen-economico`);
  },

  gastos: async (id: number): Promise<GastoDetalle[]> => {
    return httpClient.get<GastoDetalle[]>(`/torneos/${id}/gastos`);
  },

  agregarGasto: async (id: number, payload: GastoPayload): Promise<GastoDetalle> => {
    return httpClient.post<GastoDetalle>(`/torneos/${id}/gastos`, payload);
  },

  modificarGasto: async (
    id: number,
    gastoId: number,
    payload: GastoPayload
  ): Promise<GastoDetalle> => {
    return httpClient.put<GastoDetalle>(`/torneos/${id}/gastos/${gastoId}`, payload);
  },

  eliminarGasto: async (id: number, gastoId: number): Promise<void> => {
    return httpClient.delete<void>(`/torneos/${id}/gastos/${gastoId}`);
  },

  /** Sella el esquema, genera el enlace y abre la inscripción; 409 TORNEO_INCOMPLETO si falta algo. */
  publicar: async (id: number): Promise<TorneoInformacion> => {
    return httpClient.post<TorneoInformacion>(`/torneos/${id}/publicar`, { aceptaTerminos: true });
  },

  /** Paso 1, en BORRADOR: reemplaza al PDF anterior. Hasta 5 MB. */
  subirReglamento: async (id: number, archivo: File): Promise<TorneoInformacion> => {
    const body = new FormData();
    body.append('archivo', archivo);
    return customFetch<TorneoInformacion>(`/torneos/${id}/reglamento`, { method: 'POST', body });
  },

  quitarReglamento: async (id: number): Promise<TorneoInformacion> => {
    return httpClient.delete<TorneoInformacion>(`/torneos/${id}/reglamento`);
  },

  /** Con la sesión, para que el organizador vea el de su borrador; publicado, el enlace abre sin sesión. */
  reglamentoPdf: async (id: number): Promise<Blob> => {
    return httpClient.get<Blob>(`/torneos/${id}/reglamento`, { comoBlob: true });
  },

  /** Usuarios activos con rol árbitro; sin texto, los primeros por apellido. */
  buscarArbitros: async (q: string, size = 8): Promise<PageResponse<ArbitroOpcion>> => {
    return httpClient.get<PageResponse<ArbitroOpcion>>('/arbitros', { params: { q, size } });
  },

  arbitros: async (id: number): Promise<ArbitroDetalle[]> => {
    return httpClient.get<ArbitroDetalle[]>(`/torneos/${id}/arbitros`);
  },

  designarArbitro: async (
    id: number,
    usuarioId: number,
    permisos: PermisoArbitro[]
  ): Promise<ArbitroDetalle> => {
    return httpClient.post<ArbitroDetalle>(`/torneos/${id}/arbitros`, { usuarioId, permisos });
  },

  quitarArbitro: async (id: number, usuarioId: number): Promise<void> => {
    await httpClient.delete(`/torneos/${id}/arbitros/${usuarioId}`);
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
