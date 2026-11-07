import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

// RequirePermiso manda la ruta a la que no se pudo entrar en `state.from`.
const RUTA_DE_INSCRIPCION = /^\/(torneos\/[^/]+\/inscripcion|inscripciones\/)/;

export const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const desde = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
  const esInscripcion = RUTA_DE_INSCRIPCION.test(desde ?? '');

  const handleVolver = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

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
      className="card"
    >
      <div
        style={{
          fontSize: '4.5rem',
          fontWeight: 800,
          background: 'var(--color-danger)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1,
          marginBottom: '1rem',
        }}
      >
        403
      </div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>Acceso Denegado</h1>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', marginBottom: '1.75rem', lineHeight: 1.5 }}>
        {esInscripcion ? (
          'Tu cuenta no tiene habilitada la inscripción a torneos. Si creés que es un error, escribile a un administrador, o iniciá sesión con otra cuenta.'
        ) : (
          'No poseés los permisos necesarios ni el rol adecuado para acceder a esta sección del módulo de administración.'
        )}
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
        <button
          type="button"
          onClick={handleVolver}
          className="btn btn-primary"
        >
          Volver
        </button>
        <Link to="/" className="btn btn-secondary">
          Ir al Inicio
        </Link>
        <Link to="/auth/login" className="btn btn-secondary">
          Iniciar sesión con otra cuenta
        </Link>
      </div>
    </div>
  );
};
