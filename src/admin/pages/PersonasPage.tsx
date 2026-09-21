import React from 'react';

export const PersonasPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <span className="badge">Permiso: PERSONA_VER</span>
        <h1 style={{ marginTop: '0.5rem' }}>Gestión de Personas</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Registro y datos personales de miembros y participantes.
        </p>
      </div>

      <div className="glass-card">
        <h3>Padrón de Personas</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
          Sección accesible gracias al permiso <code>PERSONA_VER</code>.
        </p>
      </div>
    </div>
  );
};
