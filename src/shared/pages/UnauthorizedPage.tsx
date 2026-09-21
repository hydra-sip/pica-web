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
        minHeight: '60vh',
        textAlign: 'center',
        padding: '2rem',
      }}
      className="glass-card"
    >
      <div
        style={{
          fontSize: '4rem',
          fontWeight: 800,
          background: 'linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '1rem',
        }}
      >
        403
      </div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>Acceso Denegado</h1>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', marginBottom: '1.75rem', lineHeight: 1.5 }}>
        No poseés los permisos necesarios ni el rol requerido para visualizar este recurso o sección.
      </p>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <Link to="/" className="btn btn-secondary">
          Volver al Inicio
        </Link>
        <Link to="/auth/login" className="btn btn-primary">
          Cambiar de Cuenta
        </Link>
      </div>
    </div>
  );
};
