import React from 'react';

export const RolesPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <span className="badge">Permiso: ROL_VER</span>
        <h1 style={{ marginTop: '0.5rem' }}>Gestión de Roles y Permisos</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Configuración de jerarquías de seguridad y matriz de permisos del sistema.
        </p>
      </div>

      <div className="glass-card">
        <h3>Roles del Sistema</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
          Sección accesible gracias al permiso <code>ROL_VER</code>.
        </p>
      </div>
    </div>
  );
};
