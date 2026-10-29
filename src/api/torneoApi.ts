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
  /** Cuándo se cerró la inscripción (HU-206); null mientras está abierta. */
  inscripcionCerradaEn: string | null;
  /** SHA-256 de la lista de inscriptos, sellada al cerrar la inscripción. */
  listaHash: string | null;
  creadoEn: string;
  modificadoEn: string;
  /**
   * Los campos de los pasos 1 y 2 que ya no se pueden cambiar (HU-202): vacío en BORRADOR; publicado, según las
   * inscripciones pagas; en curso o después, todos.
   */
  camposBloqueados: CampoTorneo[];
  /** Ventana de check-in (HU-308): cuántos minutos antes del cruce abre; null sin configurar. */
  checkinMinAntes: number | null;
  /** Cuántos minutos dura la ventana de check-in. */
  checkinDuracion: number | null;
  /** Qué pasa si no se presenta ninguno de los dos al vencer la ventana (HU-309). */
  checkinSinPresentes: CriterioSinPresentes;
}

/** REPROGRAMAR deja el partido sin fecha; DESCALIFICAR_AMBOS lo cierra sin ganador y el rival siguiente pasa directo. */
export type CriterioSinPresentes = 'REPROGRAMAR' | 'DESCALIFICAR_AMBOS';

/**
 * PUT /torneos/{id}/checkin: `duracion` no más que `minAntes`, así la ventana cierra antes del cruce. Sin
 * `sinPresentes` queda el criterio vigente.
 */
export interface CheckinTorneoPayload {
  minAntes: number | null;
  duracion: number | null;
  sinPresentes?: CriterioSinPresentes;
}

/** Un campo de PUT /torneos/{id}/informacion. */
export type CampoTorneo = keyof InformacionTorneoPayload;

export interface PremioPuesto {
  puesto: number;
  pct: number;
}

/**
 * Paso 3. La inscripción va entera al pozo de competidores y los premios lo reparten, menos los gastos previstos.
 * Quien se inscribe paga aparte los gastos administrativos de la plataforma.
 */
export interface EconomiaTorneo {
  valorInscripcion: number | null;
  moneda: string;
  /** El sellado al publicar; en borrador, el vigente de la plataforma. */
  pctGastosAdministrativos: number;
  /** Lo que se paga de gastos por cada inscripción; null sin valor. */
  gastosAdministrativos: number | null;
  /** Valor de la inscripción más gastos administrativos; null sin valor. */
  totalAPagar: number | null;
  premios: PremioPuesto[];
}

/** PUT /torneos/{id}/economia: los premios, en orden de puesto. */
export interface EconomiaTorneoPayload {
  valorInscripcion: number;
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
  pctGastosAdministrativos: number;
  /** Por inscripción, aparte del valor. */
  gastosAdministrativos: number | null;
  totalAPagar: number | null;
  recaudacion: number | null;
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
  /** % vigente de gastos administrativos que paga aparte quien se inscribe; al publicar queda fijo. */
  pctGastosAdministrativos: number;
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

export type EstadoPartido =
  | 'PROGRAMADO'
  | 'CHECK_IN'
  | 'EN_JUEGO'
  | 'RESULTADO_CARGADO'
  | 'CONFIRMADO'
  | 'OBJETADO'
  | 'CORREGIDO'
  | 'WALKOVER';

/** Un lado de un partido del bracket: el equipo o el jugador inscripto. */
export interface LadoBracket {
  inscripcionId: number;
  nombre: string;
  puntaje: number | null;
  penales: number | null;
  ganador: boolean | null;
}

export interface PartidoBracket {
  id: number;
  ronda: number;
  posicion: number;
  estado: EstadoPartido;
  /** El local pasa a la ronda siguiente sin jugar. */
  bye: boolean;
  /** Null hasta que se sabe quién juega. */
  local: LadoBracket | null;
  visitante: LadoBracket | null;
  cancha: string | null;
  fechaProgramada: string | null;
  arbitro: string | null;
}

export interface RondaBracket {
  numero: number;
  /** "Final", "Semifinal", "Cuartos de final"... */
  nombre: string;
  partidos: PartidoBracket[];
}

export type EstadoInscripcion =
  'BORRADOR' | 'PENDIENTE_PAGO' | 'CONFIRMADA' | 'CANCELADA' | 'REINTEGRADA';

/** Lo que cualquiera puede ver de otro usuario, sin datos personales. */
export interface UsuarioInscripto {
  id: number;
  username: string;
  nombres: string;
  apellidos: string;
}

/**
 * Una fila de GET /torneos/{id}/inscripciones (HU-206): la individual lleva `usuario`; la de equipo, `equipo`,
 * `capitan` y cuántos `jugadores` hay en la nómina, con el capitán.
 */
export interface InscripcionDelTorneo {
  id: number;
  estado: EstadoInscripcion;
  creadoEn: string;
  usuario: UsuarioInscripto | null;
  equipo: { id: number; nombre: string } | null;
  capitan: UsuarioInscripto | null;
  jugadores: number | null;
}

/** GET /torneos/{id}/bracket (HU-207): sin generar, `rondas` vacío. */
export interface BracketTorneo {
  torneoId: number;
  /** Con la que se sorteó: cualquiera puede recalcular el cuadro con ella y la lista. */
  semilla: string | null;
  listaHash: string | null;
  rondas: RondaBracket[];
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

  /** La ventana de check-in de todos los partidos del torneo; los check-ins hechos no cambian. */
  configurarCheckin: async (
    id: number,
    payload: CheckinTorneoPayload
  ): Promise<TorneoInformacion> => {
    return httpClient.put<TorneoInformacion>(`/torneos/${id}/checkin`, payload);
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

  /** Solo el organizador; el cierre es definitivo y devuelve el torneo cerrado (HU-206). */
  cerrarInscripcion: async (id: number): Promise<TorneoInformacion> => {
    return httpClient.post<TorneoInformacion>(`/torneos/${id}/cerrar-inscripcion`);
  },

  /** Las del torneo para su organizador: sin borradores, de la más vieja a la más nueva. */
  inscripciones: async (
    id: number,
    params: { estado?: EstadoInscripcion; page?: number; size?: number } = {}
  ): Promise<PageResponse<InscripcionDelTorneo>> => {
    return httpClient.get<PageResponse<InscripcionDelTorneo>>(`/torneos/${id}/inscripciones`, {
      params,
    });
  },

  /** Público: el de un torneo publicado (PICA-216). */
  bracket: async (id: number): Promise<BracketTorneo> => {
    return httpClient.get<BracketTorneo>(`/torneos/${id}/bracket`);
  },

  /** Con la inscripción cerrada; el torneo pasa a EN_CURSO (PICA-215). */
  generarBracket: async (id: number): Promise<BracketTorneo> => {
    return httpClient.post<BracketTorneo>(`/torneos/${id}/bracket`);
  },

  /** Otro sorteo, mientras no haya resultados; queda en la auditoría. */
  regenerarBracket: async (id: number): Promise<BracketTorneo> => {
    return httpClient.post<BracketTorneo>(`/torneos/${id}/bracket/regenerar`);
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
