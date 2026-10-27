import React from 'react';
import { Badge, BadgeTone } from '../../shared/ui';

export type EntityStatus = 'ACTIVO' | 'INACTIVO' | 'ELIMINADO' | string;

interface StatusChipProps {
  status: EntityStatus;
  showBeacon?: boolean;
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

export const StatusChip: React.FC<StatusChipProps> = ({ status, showBeacon = true }) => {
  const normalizado = (status || '').toUpperCase();
  const estado = ESTADOS[normalizado] ?? { tone: 'neutral' as const, label: normalizado };
  const isLive = normalizado === 'INSCRIPCION_ABIERTA' || normalizado === 'EN_CURSO' || normalizado === 'ACTIVO';

  return (
    <Badge tone={estado.tone}>
      {isLive && showBeacon && (
        <span
          className="pulse-beacon"
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: 'currentColor',
            display: 'inline-block',
            marginRight: '6px',
            flexShrink: 0,
          }}
          aria-hidden="true"
        />
      )}
      {estado.label}
    </Badge>
  );
};
