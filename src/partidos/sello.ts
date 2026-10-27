import { ResultadoPayload } from '../api/partidoApi';

/**
 * El sello del laudo como lo calcula el back (`LaudoService.sello`): SHA-256 de
 * `laudo:<partido>:<puntajeLocal>:<puntajeVisitante>:<penalesLocal>:<penalesVisitante>:<hash de la evidencia>:<justificación>`,
 * con los penales vacíos si no hay. Sirve para mostrarlo antes de confirmar.
 */
export const selloDelLaudo = async (
  partidoId: number,
  resultado: ResultadoPayload,
  evidenciaHash: string,
  justificacion: string
): Promise<string> => {
  const texto = [
    'laudo',
    partidoId,
    resultado.puntajeLocal,
    resultado.puntajeVisitante,
    resultado.penalesLocal ?? '',
    resultado.penalesVisitante ?? '',
    evidenciaHash,
    justificacion.trim(),
  ].join(':');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
};
