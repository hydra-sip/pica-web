import { customFetch, httpClient } from './httpClient';
import { PageResponse } from './usuarioApi';

/** HU-605: cómo se resolvió (o se está resolviendo) la cancelación de un torneo. */
export type EstadoCancelacion = 'AUTOMATICA' | 'EN_REVISION' | 'APROBADA' | 'RECHAZADA';

/** GET /torneos/{id}/cancelacion: lo que ve el organizador. Sin cancelar, `estado` es null. */
export interface CancelacionDelTorneo {
  /** Lo recaudado en inscripciones, sin gastos administrativos. */
  pozo: number;
  /** El % del pozo que se puede retener en gastos. */
  pctMaximo: number;
  maximoGastos: number;
  estado: EstadoCancelacion | null;
  motivo: string | null;
  pedidaEn: string | null;
  gastos: { concepto: string; monto: number }[];
  totalGastos: number;
  revisadaEn: string | null;
  motivoRechazo: string | null;
  /** Lo devuelto a las billeteras de quienes pagaron. */
  reintegrado: number;
  /** Lo que cobró el organizador: solo si soporte aprobó los gastos. */
  retenido: number;
}

/** POST /torneos/{id}/cancelacion: AUTOMATICA si no hubo gastos, EN_REVISION si los hubo. */
export interface CancelacionRealizada {
  cancelacionId: number;
  torneoId: number;
  estado: 'AUTOMATICA' | 'EN_REVISION';
  totalGastos: number;
  pozo: number;
  reintegrado: number;
}

export interface GastoACancelar {
  concepto: string;
  monto: number;
  comprobante: File | null;
}

/** GET /admin/cancelaciones: una cancelación en la cola de soporte. */
export interface CancelacionEnRevision {
  torneoId: number;
  torneoNombre: string;
  torneoSlug: string | null;
  organizador: { id: number; nombreCompleto: string; username: string };
  motivo: string;
  pedidaEn: string;
  /** Lo recaudado en inscripciones. */
  pozo: number;
  totalGastos: number;
  gastos: { id: number; concepto: string; monto: number; tipoContenido: string }[];
}

/** POST /admin/cancelaciones/{torneoId}/aprobar o /rechazar. */
export interface ResolucionCancelacion {
  torneoId: number;
  estado: 'APROBADA' | 'RECHAZADA';
  reintegrado: number;
  retenido: number;
  alOrganizador: number;
}

export const cancelacionApi = {
  detalle: async (torneoId: number): Promise<CancelacionDelTorneo> => {
    return httpClient.get<CancelacionDelTorneo>(`/torneos/${torneoId}/cancelacion`);
  },

  /** Multipart: `motivo` y, por gasto, `gastos[i].monto`, `gastos[i].concepto` y el archivo `gastos[i].comprobante`. */
  cancelar: async (
    torneoId: number,
    motivo: string,
    gastos: GastoACancelar[] = []
  ): Promise<CancelacionRealizada> => {
    const body = new FormData();
    body.append('motivo', motivo);
    gastos.forEach((g, i) => {
      body.append(`gastos[${i}].monto`, String(g.monto));
      body.append(`gastos[${i}].concepto`, g.concepto);
      if (g.comprobante) body.append(`gastos[${i}].comprobante`, g.comprobante);
    });
    return customFetch<CancelacionRealizada>(`/torneos/${torneoId}/cancelacion`, {
      method: 'POST',
      body,
    });
  },

  // --- soporte (CANCELACION_REVISAR) ---

  cola: async (page = 0, size = 20): Promise<PageResponse<CancelacionEnRevision>> => {
    return httpClient.get<PageResponse<CancelacionEnRevision>>('/admin/cancelaciones', {
      params: { page, size },
    });
  },

  /** Pide la sesión, así que se baja con el token y se abre desde memoria. */
  comprobante: async (torneoId: number, gastoId: number): Promise<Blob> => {
    return httpClient.get<Blob>(`/admin/cancelaciones/${torneoId}/gastos/${gastoId}/comprobante`, {
      comoBlob: true,
    });
  },

  aprobar: async (torneoId: number): Promise<ResolucionCancelacion> => {
    return httpClient.post<ResolucionCancelacion>(`/admin/cancelaciones/${torneoId}/aprobar`);
  },

  rechazar: async (torneoId: number, motivo: string): Promise<ResolucionCancelacion> => {
    return httpClient.post<ResolucionCancelacion>(`/admin/cancelaciones/${torneoId}/rechazar`, {
      motivo,
    });
  },
};
