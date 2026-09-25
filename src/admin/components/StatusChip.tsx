import React from 'react';

export type EntityStatus = 'ACTIVO' | 'INACTIVO' | 'ELIMINADO' | string;

interface StatusChipProps {
  status: EntityStatus;
}

export const StatusChip: React.FC<StatusChipProps> = ({ status }) => {
  const normalizedStatus = (status || '').toUpperCase();

  let style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.2rem 0.65rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    borderRadius: '9999px',
    textTransform: 'uppercase',
    letterSpacing: '0.025em',
  };

  let dotColor = '#94a3b8';
  let label = normalizedStatus;

  if (normalizedStatus === 'ACTIVO') {
    style = {
      ...style,
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
      color: '#10b981',
      border: '1px solid rgba(16, 185, 129, 0.3)',
    };
    dotColor = '#10b981';
    label = 'Activo';
  } else if (normalizedStatus === 'INACTIVO') {
    style = {
      ...style,
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      color: '#f59e0b',
      border: '1px solid rgba(245, 158, 11, 0.3)',
    };
    dotColor = '#f59e0b';
    label = 'Inactivo';
  } else if (normalizedStatus === 'PENDIENTE_VERIFICACION') {
    style = {
      ...style,
      backgroundColor: 'rgba(99, 102, 241, 0.15)',
      color: '#818cf8',
      border: '1px solid rgba(99, 102, 241, 0.3)',
    };
    dotColor = '#818cf8';
    label = 'Pendiente';
  } else if (normalizedStatus === 'BLOQUEADO') {
    style = {
      ...style,
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      color: '#f59e0b',
      border: '1px solid rgba(245, 158, 11, 0.3)',
    };
    dotColor = '#f59e0b';
    label = 'Bloqueado';
  } else if (normalizedStatus === 'ELIMINADO') {
    style = {
      ...style,
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      color: '#ef4444',
      border: '1px solid rgba(239, 68, 68, 0.3)',
    };
    dotColor = '#ef4444';
    label = 'Eliminado';
  } else {
    style = {
      ...style,
      backgroundColor: 'rgba(148, 163, 184, 0.15)',
      color: '#94a3b8',
      border: '1px solid rgba(148, 163, 184, 0.3)',
    };
  }

  return (
    <span style={style}>
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: dotColor,
        }}
      />
      {label}
    </span>
  );
};
