import React from 'react';
import { Link } from 'react-router-dom';

export const UnauthorizedPage: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '65vh',
        textAlign: 'center',
        padding: '2.5rem 1.5rem',
        maxWidth: '560px',
        margin: '2rem auto',
      }}
      className="glass-card"
    >
      <div
        style={{
          fontSize: '4.5rem',
          fontWeight: 800,
          background: 'linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1,
          marginBottom: '1rem',
        }}
      >
        403
      </div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>Acceso Denegado</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.75rem', lineHeight: 1.5 }}>
        No poseés los permisos necesarios (<code>*_VER</code>) ni el rol adecuado para acceder a esta sección del módulo de administración.
      </p>

      <div
        style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          padding: '0.85rem 1rem',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.85rem',
          color: '#fca5a5',
          marginBottom: '1.75rem',
          textAlign: 'left',
          width: '100%',
        }}
      >
        <p style={{ margin: 0, fontWeight: 600, marginBottom: '0.2rem' }}>
          💡 Ejemplo de Control de Acceso:
        </p>
        <p style={{ margin: 0, lineHeight: 1.4 }}>
          Los usuarios con rol <strong>Participante</strong> no tienen habilitados los módulos administrativos. Para ingresar con rol de <strong>Administrador</strong>, probá iniciar sesión con <code>admin@pica.edu.ar</code> / <code>admin123</code>.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link to="/" className="btn btn-secondary">
          Volver al Inicio
        </Link>
        <Link to="/auth/login" className="btn btn-primary">
          Iniciar Sesión con otra Cuenta
        </Link>
      </div>
    </div>
  );
};
