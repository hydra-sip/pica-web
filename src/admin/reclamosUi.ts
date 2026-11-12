import { DecisionReclamo, EstadoReclamo } from '../api/reclamoAdminApi';
import { BadgeTone } from '../shared/ui';

export const ESTADO_RECLAMO_UI: Record<EstadoReclamo, { texto: string; tono: BadgeTone }> = {
  PENDIENTE: { texto: 'Pendiente', tono: 'aviso' },
  ACEPTADO: { texto: 'Aceptado', tono: 'peligro' },
  RECHAZADO: { texto: 'Rechazado', tono: 'neutral' },
};

export const DECISION_RECLAMO_UI: Record<
  DecisionReclamo,
  { titulo: string; resultado: string; descripcion: string }
> = {
  SIN_FRAUDE: {
    titulo: 'Sin fraude (rechazar reclamo)',
    resultado: 'Sin fraude — Reclamo rechazado',
    descripcion:
      'El sorteo se verificó correctamente y no se detectaron irregularidades. El reclamo queda rechazado.',
  },
  FRAUDE_CONFIRMADO: {
    titulo: 'Fraude confirmado (aceptar reclamo)',
    resultado: 'Fraude confirmado — Reclamo aceptado',
    descripcion:
      'Se comprobó una alteración o irregularidad en el sorteo. El reclamo queda aceptado y la rifa se cancela con reintegro a los compradores.',
  },
};

export const decisionDeEstado = (estado: EstadoReclamo): DecisionReclamo | null => {
  if (estado === 'ACEPTADO') return 'FRAUDE_CONFIRMADO';
  if (estado === 'RECHAZADO') return 'SIN_FRAUDE';
  return null;
};

