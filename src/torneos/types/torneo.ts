export type EstadoTorneo =
  'INSCRIPCION_ABIERTA' | 'INSCRIPCION_CERRADA' | 'EN_CURSO' | 'FINALIZADO' | 'CANCELADO';

export type FormatoTorneo =
  'ELIMINACION_DIRECTA' | 'TODOS_CONTRA_TODOS' | 'FASE_GRUPOS_ELIMINACION' | 'SUIZO' | string;

export type ModalidadTorneo = 'PRESENCIAL' | 'VIRTUAL' | 'HIBRIDA' | string;

export type TipoParticipante = 'EQUIPO' | 'INDIVIDUAL' | string;

export interface PremioDetalle {
  puesto: number;
  /** % del pozo neto. */
  pct: number;
  /** Lo que le toca del pozo neto estimado; null si no se puede calcular. */
  monto: number | null;
}

export interface OrganizadorTorneo {
  id: number;
  nombreCompleto: string;
  username: string;
}

export interface TorneoResumen {
  id: number;
  slug: string;
  nombre: string;
  descripcion: string | null;
  disciplina: string;
  formato: FormatoTorneo;
  modalidad: ModalidadTorneo;
  tipoParticipante: TipoParticipante;
  sede: string | null;
  estado: EstadoTorneo;
  cupoMaximo: number;
  cupoDisponible: number;
  valorInscripcion: number;
  moneda: string;
  /** Lo que se paga aparte por inscribirse. */
  gastosAdministrativos: number;
  pozoEstimado: number;
  cierreInscripcionEn: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
}

export interface TorneoDetalle {
  id: number;
  slug: string;
  nombre: string;
  descripcion: string | null;
  disciplina: string;
  formato: FormatoTorneo;
  modalidad: ModalidadTorneo;
  tipoParticipante: TipoParticipante;
  sede: string | null;
  estado: EstadoTorneo;
  cupoMaximo: number;
  cupoMinimo: number;
  cupoDisponible: number;
  tamanioEquipo: number | null;
  valorInscripcion: number;
  moneda: string;
  /** Sellado al publicar; null en los publicados antes de que existiera (sin gastos). */
  pctGastosAdministrativos: number | null;
  /** Lo que se paga aparte por inscribirse. */
  gastosAdministrativos: number;
  /** Valor de la inscripción más gastos administrativos. */
  totalAPagar: number;
  /** Pozo neto a repartir en premios, con el cupo completo y menos los gastos (como el paso 3). */
  pozoEstimado: number;
  premios: PremioDetalle[];
  cierreInscripcionEn: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  /** El reglamento escrito en el asistente; puede venir este, el PDF o los dos. */
  reglamentoTexto: string | null;
  reglamentoUrl: string | null;
  reglamentoHash: string | null;
  organizador: OrganizadorTorneo;
  publicadoEn: string | null;
}

export interface PageMetadata {
  size: number;
  number: number;
  totalElements: number;
  totalPages: number;
}

export interface PageResponse<T> {
  content: T[];
  page: PageMetadata;
}

export interface FiltrosTorneo {
  disciplina?: string;
  estado?: EstadoTorneo | '';
  page?: number;
  size?: number;
  sort?: string;
}
