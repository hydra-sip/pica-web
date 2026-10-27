import { TorneoDetalle } from '../torneos/types/torneo';

/**
 * Si el torneo tiene la inscripción abierta: en estado de inscripción abierta y antes de la fecha de
 * cierre, según el reloj del navegador. El back valida igual.
 */
export const inscripcionAbierta = (torneo: TorneoDetalle) =>
  torneo.estado === 'INSCRIPCION_ABIERTA' &&
  (torneo.cierreInscripcionEn === null || new Date(torneo.cierreInscripcionEn) > new Date());
