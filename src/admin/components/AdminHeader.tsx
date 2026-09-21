import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';

export const AdminHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  const userRoleName = user?.roles?.[0]?.nombreAmigable || user?.roles?.[0]?.nombre || user?.role || 'Usuario';

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.9rem 1.5rem',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderBottom: '1px solid var(--border-color)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div className="logo-icon" style={{ width: '32px', height: '32px', fontSize: '1rem' }}>P</div>
          <span className="logo-text" style={{ fontSize: '1.1rem' }}>PICA <span className="logo-subtext">ADMIN</span></span>
        </Link>
        <span
          style={{
            fontSize: '0.75rem',
            padding: '0.2rem 0.5rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            color: 'var(--accent-primary)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            fontWeight: 500,
          }}
        >
          Módulo de Control
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              👤 <strong style={{ color: 'var(--text-primary)' }}>{user.name || user.username}</strong> ({userRoleName})
            </span>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="btn btn-secondary"
          style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
        >
          Cerrar Sesión
        </button>
      </div>
    </header>
  );
};
