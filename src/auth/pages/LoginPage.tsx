import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { API_BASE_URL } from '../../api/httpClient';
import { codigoDeError, mensajeDeError } from '../../shared/mensajesError';
import { Button } from '../../shared/ui';

export const LoginPage: React.FC = () => {
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Status-specific errors
  const [errorType, setErrorType] = useState<'unverified' | 'locked' | 'invalid' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  useEffect(() => {
    if (isAuthenticated && user) {
      const userRoleNames = user.roles ? user.roles.map((r) => r.nombre) : [user.role || ''];
      const isAdmin =
        userRoleNames.includes('ADMINISTRADOR') ||
        userRoleNames.includes('SUPER_USUARIO') ||
        user.permisos?.includes('USUARIO_VER') ||
        user.permisos?.includes('admin:access');

      const targetPath = from || (isAdmin ? '/admin' : '/');
      navigate(targetPath, { replace: true });
    }
  }, [isAuthenticated, user, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorType(null);
    setErrorMessage(null);
    setSuccessMsg(null);

    try {
      const loggedUser = await login(identificador, password);
      setSuccessMsg(`¡Bienvenido ${loggedUser.name}! Iniciando sesión...`);

      const userRoleNames = loggedUser.roles ? loggedUser.roles.map((r) => r.nombre) : [loggedUser.role || ''];
      const isAdmin =
        userRoleNames.includes('ADMINISTRADOR') ||
        userRoleNames.includes('SUPER_USUARIO') ||
        loggedUser.permisos?.includes('USUARIO_VER') ||
        loggedUser.permisos?.includes('admin:access');

      const targetPath = from || (isAdmin ? '/admin' : '/');

      setTimeout(() => {
        navigate(targetPath, { replace: true });
      }, 500);
    } catch (err) {
      const codigo = codigoDeError(err);
      setErrorType(
        codigo === 'EMAIL_NO_VERIFICADO' ? 'unverified' : codigo === 'USUARIO_BLOQUEADO' ? 'locked' : 'invalid'
      );
      setErrorMessage(
        mensajeDeError(err, 'No se pudo iniciar sesión.', {
          EMAIL_NO_VERIFICADO: 'Tu cuenta todavía no está verificada. Revisá tu correo para activarla.',
        })
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const backendRoot = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
    window.location.href = `${backendRoot}/oauth2/authorization/google`;
  };

  return (
    <div style={{ maxWidth: '450px', margin: '2rem auto' }} className="card">
      <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Iniciar Sesión</h2>
      <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Ingresá tus credenciales para acceder a PICA Web
      </p>

      {/* Alertas Contextuales según ProblemDetail del contrato OpenAPI */}
      {errorType === 'unverified' && (
        <div style={{ background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)', color: 'var(--color-warning)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.88rem', lineHeight: 1.4 }}>
          {errorMessage}
          <div style={{ marginTop: '0.5rem' }}>
            <Link to="/auth/check-email" style={{ color: 'var(--accent-teal)', fontWeight: 500, textDecoration: 'underline' }}>
              Ir a la pantalla de verificación
            </Link>
          </div>
        </div>
      )}

      {errorType === 'locked' && (
        <div style={{ background: 'var(--color-danger-border)', border: '1px solid var(--color-danger-border)', color: 'var(--color-danger)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.88rem', lineHeight: 1.4 }}>
          {errorMessage}
        </div>
      )}

      {errorType === 'invalid' && (
        <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', color: 'var(--color-danger)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.88rem' }}>
          {errorMessage}
        </div>
      )}

      {successMsg && (
        <div style={{ background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)', color: 'var(--color-success)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.88rem' }}>
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--color-text-secondary)' }}>
            Usuario o Correo Electrónico (identificador)
          </label>
          <input
            type="text"
            required
            placeholder="admin@pica.edu.ar o admin"
            value={identificador}
            onChange={(e) => setIdentificador(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-input-bg)',
              color: 'var(--color-text)',
              outline: 'none',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--color-text-secondary)' }}>
            Contraseña
          </label>
          <input
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-input-bg)',
              color: 'var(--color-text)',
              outline: 'none',
            }}
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '0.25rem' }}>
          {loading ? 'Ingresando...' : 'Iniciar Sesión'}
        </button>
      </form>

      {/* Separador Visual */}
      <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0', gap: '0.75rem' }}>
        <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }}></div>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>O CONTINUÁ CON</span>
        <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }}></div>
      </div>

      {/* Botón Google OAuth2 */}
      <Button variant="secondary" block onClick={handleGoogleLogin}>
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
        Continuar con Google
      </Button>
    </div>
  );
};
