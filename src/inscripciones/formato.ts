import type { EstadoInscripcion, RolEnInscripcion } from '../api/inscripcionApi';
import type { BadgeTone } from '../shared/ui';

/** Texto y color del Badge de cada estado de una inscripción. */
export const ESTADO_INSCRIPCION: Record<EstadoInscripcion, { texto: string; tono: BadgeTone }> = {
  BORRADOR: { texto: 'Borrador', tono: 'neutral' },
  PENDIENTE_PAGO: { texto: 'Pendiente de pago', tono: 'aviso' },
  CONFIRMADA: { texto: 'Confirmada', tono: 'exito' },
  CANCELADA: { texto: 'Cancelada', tono: 'neutral' },
  REINTEGRADA: { texto: 'Reintegrada', tono: 'info' },
};

export const ROL_EN_INSCRIPCION: Record<RolEnInscripcion, string> = {
  CAPITAN: 'Capitán',
  JUGADOR: 'Jugador',
  INDIVIDUAL: 'Individual',
  ORGANIZADOR: 'Organizador',
};
