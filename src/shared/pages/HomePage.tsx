import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';

export const HomePage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  // Mismo criterio que el guard de /admin (RF-008)
  const veBackoffice = hasPermission(['USUARIO_VER', 'ROL_VER', 'PERSONA_VER']);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%', maxWidth: '900px', margin: '0 auto' }}>
      {/* Hero Banner */}
      <section className="glass-card" style={{ padding: '2.5rem 1.5rem', textAlign: 'center', background: 'var(--accent-gradient)' }}>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            color: '#fff',
            display: 'inline-block',
            marginBottom: '0.75rem',
          }}
        >
          Plataforma Institucional PICA
        </span>

        <h1 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.75rem)', color: '#fff', margin: '0.25rem 0 0.75rem' }}>
          Sistema de Gestión y Administración PICA
        </h1>

        <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '1rem', maxWidth: '640px', margin: '0 auto 1.5rem' }}>
          {user ? `¡Hola ${user.name}! Accedé a las funciones según tus permisos asignados.` : 'Bienvenido. Accedé con tu cuenta para acceder a las funcionalidades del sistema.'}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {user ? (
            <>
              <Link to="/mi-perfil" className="btn btn-primary" style={{ padding: '0.65rem 1.25rem' }}>
                👤 Mi Perfil
              </Link>
              {veBackoffice && (
                <Link to="/admin" className="btn btn-secondary" style={{ padding: '0.65rem 1.25rem', backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)' }}>
                  🛡️ Panel de Administración
                </Link>
              )}
            </>
          ) : (
            <>
              <Link to="/auth/login" className="btn btn-primary" style={{ padding: '0.65rem 1.25rem' }}>
                Iniciar Sesión
              </Link>
              <Link to="/auth/register" className="btn btn-secondary" style={{ padding: '0.65rem 1.25rem', backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)' }}>
                Registrarse
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Info Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
        <div className="glass-card">
          <h3>👥 Gestión de Usuarios</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
            Control de cuentas, perfiles de integrantes, roles de acceso y reseteo seguro de credenciales.
          </p>
        </div>

        <div className="glass-card">
          <h3>🛡️ Matriz de Seguridad</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
            Configuración dinámica de roles y asignación granular de permisos por módulos.
          </p>
        </div>

        <div className="glass-card">
          <h3>📇 Padrón General</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
            Registro unificado de personas, vinculación con usuarios y trazabilidad de contactos.
          </p>
        </div>
      </div>
    </div>
  );
};
