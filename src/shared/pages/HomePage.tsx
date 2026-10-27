import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import { TorneosCatalogo } from '../../torneos/components/TorneosCatalogo';
import { IconoBackoffice, IconoPerfil, IconoTrofeo, IconoUsuarios, IconoEscudo, IconoPersonas } from '../ui/Iconos';

export const HomePage: React.FC = () => {
  const { user, hasPermission } = useAuth();
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
      {/* Banner de acceso a Backoffice si es admin */}
      {veBackoffice && (
        <div
          style={{
            backgroundColor: 'var(--brand-black)',
            color: '#ffffff',
            padding: '0.75rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            boxShadow: 'var(--shadow-sm)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <IconoBackoffice size={18} />
            <span>
              <strong>Modo Administrador:</strong> Acceso a Backoffice y Gestión de Torneos.
            </span>
          </div>
          <Link
            to="/admin"
            className="btn btn-secondary"
            style={{
              padding: '0.35rem 0.85rem',
              fontSize: '0.8rem',
              backgroundColor: '#ffffff',
              color: 'var(--brand-black)',
              fontWeight: 700,
            }}
          >
            Ir al Backoffice →
          </Link>
        </div>
      )}

      {/* Hero Banner Institucional */}
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
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
            display: 'inline-block',
            marginBottom: '0.75rem',
          }}
        >
          Plataforma Institucional PICA
        </span>

        <h1 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.75rem)', margin: '0.25rem 0 0.75rem', fontWeight: 800 }}>
          Plataforma Integral de Competencia Amateur
        </h1>

        <p
          style={{
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--text-md)',
            maxWidth: '640px',
            margin: '0 auto 1.5rem',
            lineHeight: 1.6,
          }}
        >
          {user
            ? `¡Hola ${user.name}! Explorá los torneos publicados o accedé a tus funciones asignadas.`
            : 'Explorá torneos deportivos y competitivos, consultá reglamentos, seguí los brackets en vivo y participá con tu equipo.'}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <a
            href="#catalogo-torneos"
            className="btn btn-primary"
            style={{ padding: '0.65rem 1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
          >
            <IconoTrofeo size={18} />
            <span>Ver Torneos Disponibles</span>
          </a>

          {user ? (
            <>
              <Link
                to="/mi-perfil"
                className="btn btn-secondary"
                style={{ padding: '0.65rem 1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <IconoPerfil size={18} />
                <span>Mi Perfil</span>
              </Link>
              {veBackoffice && (
                <Link
                  to="/admin"
                  className="btn btn-secondary"
                  style={{ padding: '0.65rem 1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <IconoBackoffice size={18} />
                  <span>Panel de Administración</span>
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
      <div id="catalogo-torneos">
        <TorneosCatalogo pageSize={6} />
      </div>

      {/* Info Cards del Sistema sin emojis */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        <div className="card">
          <h3 style={{ fontSize: 'var(--text-md)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <IconoUsuarios size={18} />
            <span>Gestión de Usuarios</span>
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.5 }}>
            Control de cuentas, perfiles de integrantes, roles de acceso y reseteo seguro de
            credenciales.
          </p>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 'var(--text-md)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <IconoEscudo size={18} />
            <span>Matriz de Seguridad</span>
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.5 }}>
            Configuración dinámica de roles y asignación granular de permisos por módulos.
          </p>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 'var(--text-md)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <IconoPersonas size={18} />
            <span>Padrón General</span>
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.5 }}>
            Registro unificado de personas, vinculación con usuarios y trazabilidad de contactos.
          </p>
        </div>
      </div>
    </div>
  );
};
