import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { IconoAlerta } from '../ui/Iconos';

// RequirePermiso manda la ruta a la que no se pudo entrar en `state.from`.
const RUTA_DE_INSCRIPCION = /^\/(torneos\/[^/]+\/inscripcion|inscripciones\/)/;

export const UnauthorizedPage: React.FC = () => {
  const desde = (useLocation().state as { from?: { pathname?: string } } | null)?.from?.pathname;
  const esInscripcion = RUTA_DE_INSCRIPCION.test(desde ?? '');

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
          <>
            No poseés los permisos necesarios (<code>*_VER</code>) ni el rol adecuado para acceder a esta sección del módulo de administración.
          </>
        )}
      </p>

      {!esInscripcion && (
        <div
          style={{
            background: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            color: 'var(--color-danger)',
            marginBottom: '1.75rem',
            textAlign: 'left',
            width: '100%',
          }}
        >
          <p style={{ margin: 0, fontWeight: 600, marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <IconoAlerta size={15} />
            <span>Ejemplo de Control de Acceso:</span>
          </p>
          <p style={{ margin: 0, lineHeight: 1.4 }}>
            Los usuarios con rol <strong>Participante</strong> no tienen habilitados los módulos administrativos. Para ingresar con rol de <strong>Administrador</strong>, probá iniciar sesión con <code>admin@pica.edu.ar</code> / <code>admin123</code>.
          </p>
        </div>
      )}

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
