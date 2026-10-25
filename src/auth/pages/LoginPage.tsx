import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ApiError, API_BASE_URL } from '../../api/httpClient';

export const LoginPage: React.FC = () => {
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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
    } catch (err: any) {
      let code = '';
      let detail = err.message || '';

      if (err instanceof ApiError && err.problemDetail) {
        code = err.problemDetail.codigo || '';
        detail = err.problemDetail.detail || detail;
      }

      if (code === 'EMAIL_NO_VERIFICADO' || detail.toLowerCase().includes('verificad')) {
        setErrorType('unverified');
        setErrorMessage('Tu cuenta aún no ha sido verificada. Revisá tu casilla de correo para activarla.');
      } else if (code === 'USUARIO_BLOQUEADO' || detail.toLowerCase().includes('bloquead')) {
        setErrorType('locked');
        setErrorMessage('Tu cuenta ha sido bloqueada. Por favor, contactá al administrador.');
      } else {
        setErrorType('invalid');
        setErrorMessage(detail || 'Usuario/email o contraseña incorrectos.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const backendRoot = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
    window.location.href = `${backendRoot}/oauth2/authorization/google`;
  };

  return (
    <div style={{ maxWidth: '420px', margin: '2rem auto', padding: '0 0.5rem' }}>
      <div className="hydra-card" style={{ padding: '2.25rem 2rem' }}>
        {/* Logo and Brand Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.75rem' }}>
          <div
            className="hydra-logo-badge"
            style={{ width: '52px', height: '52px', fontSize: '1.65rem', borderRadius: '14px', marginBottom: '0.85rem' }}
          >
            H
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '0.04em', margin: 0, color: 'var(--text-primary)' }}>
            HYDRA
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Plataforma Integral de Torneos
          </p>
        </div>

        {/* Segmented Control: Iniciar Sesión / Registrarse */}
        <div className="hydra-segmented-control" style={{ marginBottom: '1.5rem' }}>
          <button type="button" className="hydra-segmented-tab active">
            Iniciar Sesión
          </button>
          <Link to="/auth/register" className="hydra-segmented-tab">
            Registrarse
          </Link>
        </div>

        {/* Botón Google OAuth2 */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: 'var(--shadow-xs)',
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          Continuar con Google
        </button>

        {/* Separador Visual */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '1.25rem 0', gap: '0.75rem' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>o con email</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
        </div>

        {/* Alertas Contextuales */}
        {errorType === 'unverified' && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '0.85rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.85rem', lineHeight: 1.4 }}>
            <strong>⚠️ EMAIL_NO_VERIFICADO (403):</strong> {errorMessage}
            <div style={{ marginTop: '0.5rem' }}>
              <Link to="/auth/check-email" style={{ color: 'var(--brand-black)', fontWeight: 600, textDecoration: 'underline' }}>
                👉 Ir a pantalla de verificación
              </Link>
            </div>
          </div>
        )}

        {errorType === 'locked' && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.85rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.85rem', lineHeight: 1.4 }}>
            <strong>🚫 USUARIO_BLOQUEADO (403):</strong> {errorMessage}
          </div>
        )}

        {errorType === 'invalid' && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.85rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
            ❌ {errorMessage}
          </div>
        )}

        {successMsg && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '0.85rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
              Correo Electrónico
            </label>
            <input
              type="text"
              required
              placeholder="ejemplo@correo.com"
              value={identificador}
              onChange={(e) => setIdentificador(e.target.value)}
              style={{
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 0.9rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 2.5rem 0.75rem 0.9rem',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                }}
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', color: 'var(--text-primary)', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--brand-black)', cursor: 'pointer' }}
              />
              Recordar sesión
            </label>
            <span style={{ fontWeight: 700, color: 'var(--brand-black)', cursor: 'pointer' }}>
              ¿Olvidaste tu clave?
            </span>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              padding: '0.85rem',
              fontSize: '0.95rem',
              fontWeight: 700,
              marginTop: '0.5rem',
              width: '100%',
              borderRadius: 'var(--radius-md)',
            }}
          >
            {loading ? 'Ingresando...' : 'Ingresar a la Plataforma'}
          </button>
        </form>

        {/* Footer Legal Notice */}
        <div style={{ marginTop: '2.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Al continuar, aceptas las Bases y Condiciones<br />
          <strong style={{ color: 'var(--text-primary)' }}>y la Política de Privacidad de Hydra</strong>
        </div>
      </div>
    </div>
  );
};
