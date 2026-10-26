import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import { TorneosCatalogo } from '../../torneos/components/TorneosCatalogo';

export const HomePage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  // Mismo criterio que el guard de /admin (RF-008)
  const veBackoffice = hasPermission(['USUARIO_VER', 'ROL_VER', 'PERSONA_VER']);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
        width: '100%',
        maxWidth: '1050px',
        margin: '0 auto',
      }}
    >
      {/* Hero Banner */}
      <section
        className="card"
        style={{
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          background: 'var(--color-surface)',
        }}
      >
        <span
          style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
            display: 'inline-block',
            marginBottom: '0.75rem',
          }}
        >
          Plataforma Institucional PICA
        </span>

        <h1 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.75rem)', margin: '0.25rem 0 0.75rem' }}>
          Sistema de Gestión y Administración PICA
        </h1>

        <p
          style={{
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--text-md)',
            maxWidth: '640px',
            margin: '0 auto 1.5rem',
          }}
        >
          {user
            ? `¡Hola ${user.name}! Explorá los torneos publicados o accedé a tus funciones asignadas.`
            : 'Bienvenido. Explorá torneos deportivos y competitivos, consultá reglamentos y elegí en cuál participar.'}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <a
            href="#catalogo-torneos"
            className="btn btn-primary"
            style={{ padding: '0.65rem 1.25rem' }}
          >
            🏆 Ver Torneos Disponibles
          </a>

          {user ? (
            <>
              <Link
                to="/mi-perfil"
                className="btn btn-secondary"
                style={{ padding: '0.65rem 1.25rem' }}
              >
                👤 Mi Perfil
              </Link>
              {veBackoffice && (
                <Link
                  to="/admin"
                  className="btn btn-secondary"
                  style={{ padding: '0.65rem 1.25rem' }}
                >
                  🛡️ Panel de Administración
                </Link>
              )}
            </>
          ) : (
            <>
              <Link
                to="/auth/login"
                className="btn btn-secondary"
                style={{ padding: '0.65rem 1.25rem' }}
              >
                Iniciar Sesión
              </Link>
              <Link
                to="/auth/register"
                className="btn btn-secondary"
                style={{ padding: '0.65rem 1.25rem' }}
              >
                Registrarse
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Catálogo público de torneos con filtros y paginación (HU-208 / T208-2) */}
      <TorneosCatalogo pageSize={6} />

      {/* Info Cards del Sistema */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        <div className="card">
          <h3 style={{ fontSize: 'var(--text-md)', marginBottom: '0.35rem' }}>
            👥 Gestión de Usuarios
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            Control de cuentas, perfiles de integrantes, roles de acceso y reseteo seguro de
            credenciales.
          </p>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 'var(--text-md)', marginBottom: '0.35rem' }}>
            🛡️ Matriz de Seguridad
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            Configuración dinámica de roles y asignación granular de permisos por módulos.
          </p>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 'var(--text-md)', marginBottom: '0.35rem' }}>📇 Padrón General</h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            Registro unificado de personas, vinculación con usuarios y trazabilidad de contactos.
          </p>
        </div>
      </div>
    </div>
  );
};
