import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';

export const AdminSidebar: React.FC = () => {
  const { hasPermission, user } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  const canViewUsuarios = hasPermission('USUARIO_VER');
  const canViewRoles = hasPermission('ROL_VER');
  const canViewPersonas = hasPermission('PERSONA_VER');

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'AD';

  const userRoleName = user?.roles?.[0]?.nombreAmigable || user?.roles?.[0]?.nombre || user?.role || 'Administrador';

  const navItemStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    padding: '0.65rem 0.85rem',
    borderRadius: 'var(--radius-md)',
    color: active ? '#ffffff' : 'var(--text-secondary)',
    backgroundColor: active ? 'var(--brand-black)' : 'transparent',
    fontWeight: active ? 600 : 500,
    fontSize: '0.88rem',
    textDecoration: 'none',
    transition: 'all 0.15s ease',
  });

  return (
    <aside
      style={{
        width: '260px',
        backgroundColor: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-color)',
        padding: '1.5rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: 'calc(100vh - 65px)',
      }}
    >
      <div>
        {/* Brand in Sidebar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0 0.5rem 1.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
          <div className="hydra-logo-badge" style={{ width: '28px', height: '28px', fontSize: '0.9rem', borderRadius: '7px' }}>
            H
          </div>
          <span style={{ fontSize: '0.95rem', fontWeight: 800, letterSpacing: '0.03em' }}>
            Backoffice Admin
          </span>
        </div>

        {/* Navigation Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.25rem 0.75rem 0.5rem' }}>
            Consola
          </div>

          <Link to="/admin" style={navItemStyle(isActive('/admin'))}>
            <span style={{ fontSize: '1.1rem' }}>📊</span> Dashboard
          </Link>

          {canViewUsuarios && (
            <Link to="/admin/usuarios" style={navItemStyle(isActive('/admin/usuarios'))}>
              <span style={{ fontSize: '1.1rem' }}>👥</span> Usuarios
            </Link>
          )}

          {canViewRoles && (
            <Link to="/admin/roles" style={navItemStyle(isActive('/admin/roles'))}>
              <span style={{ fontSize: '1.1rem' }}>🛡️</span> Roles & Permisos
            </Link>
          )}

          {canViewPersonas && (
            <Link to="/admin/personas" style={navItemStyle(isActive('/admin/personas'))}>
              <span style={{ fontSize: '1.1rem' }}>📇</span> Personas
            </Link>
          )}
        </div>
      </div>

      {/* Footer Profile info */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: 'var(--brand-black)',
            }}
          >
            {userInitials}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {user?.name || 'Administrador'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              {userRoleName}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
