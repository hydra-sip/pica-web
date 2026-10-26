import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import { IconoAlerta } from '../ui/Iconos';

export const IncompleteProfileBanner: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  // Don't render banner if not logged in or if profile data is complete
  if (!isAuthenticated || !user || user.datosCompletos === true) {
    return null;
  }

  // Also don't show the banner if user is currently on /mi-perfil
  if (location.pathname === '/mi-perfil') {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--color-warning-bg)',
        borderBottom: '1px solid var(--color-warning-border)',
        color: 'var(--color-warning)',
        padding: '0.75rem 1rem',
        fontSize: '0.9rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        flexWrap: 'wrap',
        zIndex: 1000,
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
        <IconoAlerta size={16} />
        <span><strong>Atención:</strong> Tu perfil requiere información adicional (documento y teléfono) para operar normalmente.</span>
      </span>
      <Link
        to="/mi-perfil"
        className="btn btn-secondary"
        style={{
          padding: '0.25rem 0.75rem',
          fontSize: '0.8rem',
          backgroundColor: 'var(--color-warning-border)',
          color: 'var(--color-warning)',
          borderColor: 'var(--color-warning-border)',
        }}
      >
        Completar Perfil →
      </Link>
    </div>
  );
};
