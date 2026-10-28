import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import { IconoSitio } from '../../shared/ui/Iconos';

export const AdminHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  const userRoleName = user?.roles?.[0]?.nombreAmigable || user?.roles?.[0]?.nombre || user?.role || 'Administrador';

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.85rem 1.75rem',
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-color)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div className="pica-logo-badge" style={{ width: '32px', height: '32px', fontSize: '1rem', borderRadius: '8px' }}>
            P
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '0.04em', color: 'var(--text-primary)' }}>
            PICA
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginLeft: '0.5rem' }}>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '0.2rem 0.6rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              letterSpacing: '0.03em',
            }}
          >
            SISTEMA SHA-256 OK
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Última sincronización: Hace 2 min
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link
          to="/"
          style={{
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
          }}
        >
          <IconoSitio size={16} /> Ver Portal Público
        </Link>

        {user && (
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>{user.name}</strong> ({userRoleName})
          </span>
        )}

        <button
          onClick={handleLogout}
          className="btn btn-secondary"
          style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem', fontWeight: 600 }}
        >
          Cerrar Sesión
        </button>
      </div>
    </header>
  );
};
