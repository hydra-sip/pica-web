import React from 'react';
import { Badge, BadgeTone } from '../../shared/ui';

export type EntityStatus = 'ACTIVO' | 'INACTIVO' | 'ELIMINADO' | string;

interface StatusChipProps {
  status: EntityStatus;
}

const ESTADOS: Record<string, { tone: BadgeTone; label: string }> = {
  ACTIVO: { tone: 'exito', label: 'Activo' },
  INACTIVO: { tone: 'neutral', label: 'Inactivo' },
  PENDIENTE_VERIFICACION: { tone: 'info', label: 'Pendiente' },
  BLOQUEADO: { tone: 'aviso', label: 'Bloqueado' },
  ELIMINADO: { tone: 'peligro', label: 'Eliminado' },
  // Torneos (HU-208)
  INSCRIPCION_ABIERTA: { tone: 'exito', label: 'Inscripción abierta' },
  INSCRIPCION_CERRADA: { tone: 'aviso', label: 'Inscripción cerrada' },
  EN_CURSO: { tone: 'info', label: 'En curso' },
  FINALIZADO: { tone: 'neutral', label: 'Finalizado' },
  CANCELADO: { tone: 'peligro', label: 'Cancelado' },
};

export const StatusChip: React.FC<StatusChipProps> = ({ status }) => {
  const normalizado = (status || '').toUpperCase();
  const estado = ESTADOS[normalizado] ?? { tone: 'neutral' as const, label: normalizado };
  return <Badge tone={estado.tone}>{estado.label}</Badge>;
};
