import React from 'react';
import { EstadoTorneo } from '../types/torneo';

interface TorneoEstadoBadgeProps {
  estado: EstadoTorneo;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

export const TorneoEstadoBadge: React.FC<TorneoEstadoBadgeProps> = ({
  estado,
  size = 'md',
  showDot = true,
}) => {
  let label: string = estado;
  let bg = 'rgba(148, 163, 184, 0.15)';
  let color = '#94a3b8';
  let border = 'rgba(148, 163, 184, 0.3)';
  let dotColor = '#94a3b8';
  let isPulsing = false;

  switch (estado) {
    case 'INSCRIPCION_ABIERTA':
      label = 'Inscripción Abierta';
      bg = 'rgba(16, 185, 129, 0.15)';
      color = '#10b981';
      border = 'rgba(16, 185, 129, 0.35)';
      dotColor = '#10b981';
      isPulsing = true;
      break;
    case 'INSCRIPCION_CERRADA':
      label = 'Inscripción Cerrada';
      bg = 'rgba(245, 158, 11, 0.15)';
      color = '#f59e0b';
      border = 'rgba(245, 158, 11, 0.35)';
      dotColor = '#f59e0b';
      break;
    case 'EN_CURSO':
      label = 'En Curso';
      bg = 'rgba(6, 182, 212, 0.15)';
      color = '#06b6d4';
      border = 'rgba(6, 182, 212, 0.35)';
      dotColor = '#06b6d4';
      isPulsing = true;
      break;
    case 'FINALIZADO':
      label = 'Finalizado';
      bg = 'rgba(148, 163, 184, 0.15)';
      color = '#cbd5e1';
      border = 'rgba(148, 163, 184, 0.25)';
      dotColor = '#94a3b8';
      break;
    case 'CANCELADO':
      label = 'Cancelado';
      bg = 'rgba(239, 68, 68, 0.15)';
      color = '#ef4444';
      border = 'rgba(239, 68, 68, 0.35)';
      dotColor = '#ef4444';
      break;
  }

  const sizeStyles: Record<'sm' | 'md' | 'lg', React.CSSProperties> = {
    sm: {
      padding: '0.15rem 0.5rem',
      fontSize: '0.7rem',
      gap: '0.3rem',
    },
    md: {
      padding: '0.25rem 0.75rem',
      fontSize: '0.78rem',
      gap: '0.4rem',
    },
    lg: {
      padding: '0.35rem 1rem',
      fontSize: '0.875rem',
      gap: '0.5rem',
    },
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontWeight: 600,
        borderRadius: '9999px',
        backgroundColor: bg,
        color: color,
        border: `1px solid ${border}`,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        ...sizeStyles[size],
      }}
    >
      {showDot && (
        <span
          style={{
            position: 'relative',
            display: 'inline-flex',
            width: size === 'sm' ? '6px' : '8px',
            height: size === 'sm' ? '6px' : '8px',
          }}
        >
          {isPulsing && (
            <span
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                backgroundColor: dotColor,
                opacity: 0.75,
                animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
              }}
            />
          )}
          <span
            style={{
              position: 'relative',
              display: 'inline-block',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              backgroundColor: dotColor,
            }}
          />
        </span>
      )}
      {label}
    </span>
  );
};
