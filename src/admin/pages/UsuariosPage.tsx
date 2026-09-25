import React from 'react';

export const UsuariosPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <span className="badge">Permiso: USUARIO_VER</span>
        <h1 style={{ marginTop: '0.5rem' }}>Gestión de Usuarios</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Administración de cuentas de usuario, estado y credenciales.
        </p>
      </div>

      <div className="glass-card">
        <h3>Lista de Usuarios Registrados</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
          Sección accesible gracias al permiso <code>USUARIO_VER</code>.
        </p>
      </div>
    </div>
  );
};
