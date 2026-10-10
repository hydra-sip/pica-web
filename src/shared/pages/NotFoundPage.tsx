import React from 'react';
import { Link } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem' }} className="glass-card">
      <h1 style={{ fontSize: '4rem', color: 'var(--accent-secondary)' }}>404</h1>
      <h2 style={{ marginBottom: '1rem' }}>Página no encontrada</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        La ruta a la que estás intentando acceder no existe o se ha movido.
      </p>
      <Link to="/" className="btn btn-primary">
        Volver al Inicio
      </Link>
    </div>
  );
};
