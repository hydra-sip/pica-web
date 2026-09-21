import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const LoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
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

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  useEffect(() => {
    if (isAuthenticated && user) {
      const isAdmin = user.role === 'ADMIN' || user.permissions?.includes('admin:access');
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
      const loggedUser = await login(identifier, password);
      setSuccessMsg(`¡Bienvenido ${loggedUser.name}! Iniciando sesión...`);

      const isAdmin = loggedUser.role === 'ADMIN' || loggedUser.permissions?.includes('admin:access');
      const targetPath = from || (isAdmin ? '/admin' : '/');

      setTimeout(() => {
        navigate(targetPath, { replace: true });
      }, 500);
    } catch (err: any) {
      const msg = err.message || '';
      const lower = msg.toLowerCase();

      if (lower.includes('verificad') || lower.includes('unverified')) {
        setErrorType('unverified');
        setErrorMessage('Tu cuenta aún no ha sido verificada. Revisá tu casilla de correo para activarla.');
      } else if (lower.includes('bloquead') || lower.includes('locked')) {
        setErrorType('locked');
        setErrorMessage('Tu cuenta ha sido bloqueada. Por favor, contactá al administrador.');
      } else {
        setErrorType('invalid');
        setErrorMessage(msg || 'Usuario/email o contraseña incorrectos.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Redirección OAuth2 estándar al backend Spring / Node
    window.location.href = `${API_BASE_URL}/oauth2/authorization/google`;
  };

  return (
    <div style={{ maxWidth: '450px', margin: '2rem auto' }} className="glass-card">
      <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Iniciar Sesión</h2>
      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Ingresá tus credenciales para acceder a PICA Web
      </p>

      {/* Alertas Contextuales por tipo de error */}
      {errorType === 'unverified' && (
        <div style={{ background: 'rgba(234, 179, 8, 0.15)', border: '1px solid rgba(234, 179, 8, 0.4)', color: '#facc15', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.88rem', lineHeight: 1.4 }}>
          <strong>⚠️ Cuenta no verificada:</strong> {errorMessage}
          <div style={{ marginTop: '0.5rem' }}>
            <Link to="/auth/check-email" style={{ color: 'var(--accent-teal)', fontWeight: 500, textDecoration: 'underline' }}>
              👉 Ir a pantalla de verificación
            </Link>
          </div>
        </div>
      )}

      {errorType === 'locked' && (
        <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)', color: '#fca5a5', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.88rem', lineHeight: 1.4 }}>
          <strong>🚫 Cuenta Bloqueada:</strong> {errorMessage}
        </div>
      )}

      {errorType === 'invalid' && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.88rem' }}>
          ❌ {errorMessage}
        </div>
      )}

      {successMsg && (
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.88rem' }}>
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
            Usuario o Correo Electrónico
          </label>
          <input
            type="text"
            required
            placeholder="admin@pica.edu.ar o admin"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'rgba(15, 23, 42, 0.7)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
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
              border: '1px solid var(--border-color)',
              backgroundColor: 'rgba(15, 23, 42, 0.7)',
              color: 'var(--text-primary)',
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
        <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>O CONTINUÁ CON</span>
        <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
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
          borderRadius: 'var(--radius-sm)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          color: 'var(--text-primary)',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')}
        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)')}
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
        Continuar con Google
      </button>

      {/* Seccion de Ayuda / Credenciales de prueba */}
      <div style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
        <p style={{ margin: '0 0 0.4rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Pruebas de Estado de Cuenta (MSW Mocks):</p>
        <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <li><code>admin@pica.edu.ar</code> / <code>admin123</code> (Admin $\rightarrow$ `/admin`)</li>
          <li><code>user@pica.edu.ar</code> / <code>user123</code> (Usuario $\rightarrow$ `/`)</li>
          <li><code>noverificado@pica.edu.ar</code> / <code>cualquiera</code> (No Verificado)</li>
          <li><code>bloqueado@pica.edu.ar</code> / <code>cualquiera</code> (Bloqueado)</li>
        </ul>
        <div style={{ marginTop: '0.6rem' }}>
          <p style={{ margin: '0 0 0.2rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Prueba rápida OAuth Callback:</p>
          <Link to="/oauth/callback?code=mock-google-code-admin" style={{ color: 'var(--accent-teal)', textDecoration: 'underline' }}>
            Canjear Código Google (Admin)
          </Link>
        </div>
      </div>
    </div>
  );
};
