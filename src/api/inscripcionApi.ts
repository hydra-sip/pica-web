import { httpClient } from './httpClient';
import { UsuarioPublico } from './jugadorApi';
import { PageResponse } from './usuarioApi';

export type EstadoInscripcion =
  'BORRADOR' | 'PENDIENTE_PAGO' | 'CONFIRMADA' | 'CANCELADA' | 'REINTEGRADA';

/** El equipo dentro de una inscripción o de un resumen de pago. */
export interface EquipoInscripto {
  id: number;
  nombre: string;
}

/** El torneo de una inscripción, para mostrarlo y llegar a su ficha con `torneoApi.getTorneoBySlug`. */
export interface TorneoDeInscripcion {
  id: number;
  nombre: string;
  /** Null mientras el torneo no se publicó, cosa que no pasa con uno que ya tiene inscripciones. */
  slug: string | null;
}

/** Fila de GET /inscripciones/mias. La individual lleva `usuarioId`; la de equipo, `equipo`. */
export interface InscripcionResumen {
  id: number;
  torneoId: number;
  torneo: TorneoDeInscripcion;
  usuarioId?: number | null;
  estado: EstadoInscripcion;
  creadoEn: string;
  modificadoEn: string;
  equipo?: EquipoInscripto | null;
}

/**
 * GET /inscripciones/{id}; también lo devuelven el alta, editar, confirmar, reabrir y pagar.
 * La de equipo lleva `equipo` y `nomina` (con el capitán) y su `usuarioId` es null.
 */
export interface InscripcionDetalle extends InscripcionResumen {
  /** Se completa al confirmar; en BORRADOR es null. */
  reglamentoAceptadoEn?: string | null;
  nomina?: UsuarioPublico[] | null;
}

/** Cuerpo de crear y editar en un torneo por equipos: exactamente uno de equipoId y nombreEquipoNuevo. */
export interface InscripcionEquipoPayload {
  equipoId?: number;
  /** Hasta 100 caracteres; se crea el equipo con el capitán como capitán e integrante. */
  nombreEquipoNuevo?: string;
  /** Ids de los demás jugadores; el capitán entra siempre, figure o no. */
  nomina?: number[];
}

/** GET /inscripciones/{id}/resumen-pago. La individual lleva `participante`; la de equipo, `equipo`. */
export interface ResumenPago {
  inscripcionId: number;
  torneo: { id: number; nombre: string };
  participante?: UsuarioPublico | null;
  equipo?: EquipoInscripto | null;
  /** El valor de la inscripción, sin comisiones. */
  monto: number;
  moneda: string;
  cupoMaximo: number;
  /** El cupo máximo menos las inscripciones confirmadas. */
  cupoDisponible: number;
  cierreInscripcionEn: string;
}

/** Cuerpo del reemplazo: sale un jugador de la nómina y entra otro. */
export interface ReemplazoPayload {
  saleUsuarioId: number;
  entraUsuarioId: number;
}

/** Un reemplazo del historial (GET /inscripciones/{id}/reemplazos): quién salió, quién entró, cuándo y quién lo hizo. */
export interface Reemplazo {
  sale: UsuarioPublico;
  entra: UsuarioPublico;
  reemplazadoEn: string;
  realizadoPor: UsuarioPublico;
}

// Inscripciones del participante. Crear, editar, reemplazar, cancelar, confirmar, reabrir, ver el
// resumen de pago y pagar exigen INSCRIPCION_GESTIONAR; ver y listar alcanza con estar logueado.
export const inscripcionApi = {
  /** Borrador en un torneo. En uno individual va sin cuerpo; en uno por equipos, con el equipo y la nómina. */
  crear: async (
    torneoId: number,
    payload?: InscripcionEquipoPayload
  ): Promise<InscripcionDetalle> => {
    return httpClient.post<InscripcionDetalle>(`/torneos/${torneoId}/inscripciones`, payload);
  },

  obtener: async (id: number): Promise<InscripcionDetalle> => {
    return httpClient.get<InscripcionDetalle>(`/inscripciones/${id}`);
  },

  /** Cambia el equipo y la nómina de un borrador de equipo. */
  editar: async (id: number, payload: InscripcionEquipoPayload): Promise<InscripcionDetalle> => {
    return httpClient.put<InscripcionDetalle>(`/inscripciones/${id}`, payload);
  },

  /** Pasa a CANCELADA un borrador o una pendiente de pago. */
  cancelar: async (id: number): Promise<void> => {
    return httpClient.delete<void>(`/inscripciones/${id}`);
  },

  /** Confirma el borrador aceptando el reglamento: queda PENDIENTE_PAGO, o CONFIRMADA si el torneo es gratis. */
  confirmar: async (id: number, reglamentoAceptado: boolean): Promise<InscripcionDetalle> => {
    return httpClient.put<InscripcionDetalle>(`/inscripciones/${id}/confirmar`, {
      reglamentoAceptado,
    });
  },

  /** Vuelve una pendiente de pago a borrador (se pierde la aceptación del reglamento). */
  reabrir: async (id: number): Promise<InscripcionDetalle> => {
    return httpClient.put<InscripcionDetalle>(`/inscripciones/${id}/reabrir`);
  },

  resumenPago: async (id: number): Promise<ResumenPago> => {
    return httpClient.get<ResumenPago>(`/inscripciones/${id}/resumen-pago`);
  },

  /** Cobra y deja la inscripción en CONFIRMADA. Reintentar una ya confirmada responde 200 sin cobrar. */
  pagar: async (id: number): Promise<InscripcionDetalle> => {
    return httpClient.post<InscripcionDetalle>(`/inscripciones/${id}/pago`);
  },

  /** Las que armó el usuario (todos los estados, la más nueva primero); con `torneoId`, solo las de ese torneo. */
  /** Reemplazo en una CONFIRMADA de equipo, solo del capitán: devuelve la inscripción con la nómina actualizada. */
  reemplazar: async (id: number, payload: ReemplazoPayload): Promise<InscripcionDetalle> => {
    return httpClient.post<InscripcionDetalle>(`/inscripciones/${id}/reemplazos`, payload);
  },

  /** Historial de reemplazos, del más viejo al más nuevo. Lo ven el capitán, la nómina y el organizador. */
  reemplazos: async (id: number): Promise<Reemplazo[]> => {
    return httpClient.get<Reemplazo[]>(`/inscripciones/${id}/reemplazos`);
  },

  listarMias: async (params?: {
    torneoId?: number;
    page?: number;
    size?: number;
  }): Promise<PageResponse<InscripcionResumen>> => {
    return httpClient.get<PageResponse<InscripcionResumen>>('/inscripciones/mias', { params });
  },
};
