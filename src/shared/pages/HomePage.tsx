import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import { TorneosCatalogo } from '../../torneos/components/TorneosCatalogo';

export const HomePage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const veBackoffice = hasPermission(['USUARIO_VER', 'ROL_VER', 'PERSONA_VER']);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
      }}
    >
      {/* Top Welcome / Backoffice banner if admin */}
      {veBackoffice && (
        <div
          style={{
            backgroundColor: 'var(--brand-black)',
            color: '#ffffff',
            padding: '0.75rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            boxShadow: 'var(--shadow-sm)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontSize: '0.85rem' }}>
            👑 <strong>Modo Administrador:</strong> Acceso a Backoffice y Gestión de Torneos.
          </div>
          <Link
            to="/admin"
            className="btn btn-secondary"
            style={{
              padding: '0.35rem 0.85rem',
              fontSize: '0.8rem',
              backgroundColor: '#ffffff',
              color: 'var(--brand-black)',
              fontWeight: 700,
            }}
          >
            Ir al Backoffice →
          </Link>
        </div>
      )}

      {/* Catálogo de Torneos (Figma Wireframe #37:2) */}
      <TorneosCatalogo pageSize={6} />

      {/* Bottom info section */}
      {!user && (
        <div
          style={{
            textAlign: 'center',
            padding: '1.5rem 1rem',
            color: 'var(--text-secondary)',
            fontSize: '0.88rem',
            borderTop: '1px solid var(--border-color)',
            marginTop: '1rem',
          }}
        >
          ¿Querés organizar o participar en un torneo oficial?{' '}
          <Link to="/auth/login" style={{ color: 'var(--brand-black)', fontWeight: 700, textDecoration: 'underline' }}>
            Ingresá con tu cuenta
          </Link>
          {' o '}
          <Link to="/auth/register" style={{ color: 'var(--brand-black)', fontWeight: 700, textDecoration: 'underline' }}>
            Registrate gratis
          </Link>
        </div>
      )}
    </div>
  );
};
