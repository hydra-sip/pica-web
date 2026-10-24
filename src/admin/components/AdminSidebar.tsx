import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';

export const AdminSidebar: React.FC = () => {
  const { hasPermission } = useAuth();
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

  const hasAnySection = canViewUsuarios || canViewRoles || canViewPersonas;

  return (
    <aside
      style={{
        width: '240px',
        backgroundColor: 'var(--color-input-bg)',
        borderRight: '1px solid var(--color-border)',
        padding: '1.5rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        minHeight: 'calc(100vh - 65px)',
      }}
    >
      <div>
        <span
          style={{
            display: 'block',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.75rem',
            paddingLeft: '0.5rem',
          }}
        >
          Navegación Admin
        </span>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {/* Dashboard General */}
          <Link
            to="/admin"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.65rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              color: isActive('/admin') ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              backgroundColor: isActive('/admin') ? 'var(--color-surface)' : 'transparent',
              fontWeight: isActive('/admin') ? 600 : 400,
              textDecoration: 'none',
              transition: 'all 0.2s ease',
            }}
          >
            📊 <span>Panel General</span>
          </Link>

          {/* Menú Usuarios (USUARIO_VER) */}
          {canViewUsuarios && (
            <Link
              to="/admin/usuarios"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                color: isActive('/admin/usuarios') ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                backgroundColor: isActive('/admin/usuarios') ? 'var(--color-surface)' : 'transparent',
                fontWeight: isActive('/admin/usuarios') ? 600 : 400,
                textDecoration: 'none',
                transition: 'all 0.2s ease',
              }}
            >
              👥 <span>Usuarios</span>
            </Link>
          )}

          {/* Menú Roles (ROL_VER) */}
          {canViewRoles && (
            <Link
              to="/admin/roles"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                color: isActive('/admin/roles') ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                backgroundColor: isActive('/admin/roles') ? 'var(--color-surface)' : 'transparent',
                fontWeight: isActive('/admin/roles') ? 600 : 400,
                textDecoration: 'none',
                transition: 'all 0.2s ease',
              }}
            >
              🛡️ <span>Roles</span>
            </Link>
          )}

          {/* Menú Personas (PERSONA_VER) */}
          {canViewPersonas && (
            <Link
              to="/admin/personas"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                color: isActive('/admin/personas') ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                backgroundColor: isActive('/admin/personas') ? 'var(--color-surface)' : 'transparent',
                fontWeight: isActive('/admin/personas') ? 600 : 400,
                textDecoration: 'none',
                transition: 'all 0.2s ease',
              }}
            >
              📇 <span>Personas</span>
            </Link>
          )}

          {!hasAnySection && (
            <div style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Sin secciones adicionales habilitadas para tu perfil.
            </div>
          )}
        </nav>
      </div>
    </aside>
  );
};
