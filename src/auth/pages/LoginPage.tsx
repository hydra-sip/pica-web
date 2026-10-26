import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ApiError, API_BASE_URL } from '../../api/httpClient';
import {
  IconoPerfil,
  IconoBackoffice,
  IconoEscudo,
  IconoBilletera,
  IconoUsuarios,
  IconoRoles,
  IconoRifas,
  IconoAlerta,
  IconoCandado,
} from '../../shared/ui/Iconos';
import './LoginPage.css';

type LoginMode = 'cliente' | 'backoffice';
type BackofficeRoleTab = 'ADMIN' | 'ORGANIZADOR';

export const LoginPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  // Determinar modo inicial: URL param ?mode=backoffice o si venía navegando hacia /admin
  const initialModeParam = searchParams.get('mode');
  const [mode, setMode] = useState<LoginMode>(
    initialModeParam === 'backoffice' || from?.startsWith('/admin') ? 'backoffice' : 'cliente'
  );

  // Rol activo dentro del login Backoffice (Organizador vs Administrador)
  const [backofficeRole, setBackofficeRole] = useState<BackofficeRoleTab>('ADMIN');

  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  // Estados de error específicos
  const [errorType, setErrorType] = useState<'unverified' | 'locked' | 'invalid' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Si ya está autenticado, redirigir automáticamente según permisos y destino
  useEffect(() => {
    if (isAuthenticated && user) {
      const userRoleNames = user.roles ? user.roles.map((r) => r.nombre) : [user.role || ''];
      const isAdmin =
        userRoleNames.includes('ADMINISTRADOR') ||
        userRoleNames.includes('SUPER_USUARIO') ||
        user.permisos?.includes('USUARIO_VER') ||
        user.permisos?.includes('admin:access');

      const targetPath = from || (mode === 'backoffice' || isAdmin ? '/admin' : '/');
      navigate(targetPath, { replace: true });
    }
  }, [isAuthenticated, user, navigate, from, mode]);

  // Sincronizar cambio de modo en URL
  const handleModeChange = (newMode: LoginMode) => {
    setMode(newMode);
    setErrorType(null);
    setErrorMessage(null);
    setSuccessMsg(null);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('mode', newMode);
    setSearchParams(newParams, { replace: true });
  };

  const handleBackofficeRoleTab = (role: BackofficeRoleTab) => {
    setBackofficeRole(role);
    setErrorType(null);
    setErrorMessage(null);
  };

  const handleFillCredentials = (userValue: string, passValue: string) => {
    setIdentificador(userValue);
    setPassword(passValue);
    setErrorType(null);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorType(null);
    setErrorMessage(null);
    setSuccessMsg(null);

    try {
      const loggedUser = await login(identificador, password);
      setSuccessMsg(`¡Bienvenido ${loggedUser.name}! Accediendo...`);

      const userRoleNames = loggedUser.roles ? loggedUser.roles.map((r) => r.nombre) : [loggedUser.role || ''];
      const isAdmin =
        userRoleNames.includes('ADMINISTRADOR') ||
        userRoleNames.includes('SUPER_USUARIO') ||
        loggedUser.permisos?.includes('USUARIO_VER') ||
        loggedUser.permisos?.includes('admin:access');

      const targetPath = from || (mode === 'backoffice' || isAdmin ? '/admin' : '/');

      setTimeout(() => {
        navigate(targetPath, { replace: true });
      }, 400);
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
    <div className="login-page-wrapper">
      {/* Barra de alternancia de modo: Usuario vs Backoffice */}
      <div className="login-mode-bar" role="tablist" aria-label="Modo de autenticación">
        <button
          type="button"
          className={`login-mode-btn ${mode === 'cliente' ? 'active' : ''}`}
          onClick={() => handleModeChange('cliente')}
          role="tab"
          aria-selected={mode === 'cliente'}
        >
          <IconoPerfil size={16} />
          <span>Plataforma Clientes</span>
        </button>
        <button
          type="button"
          className={`login-mode-btn ${mode === 'backoffice' ? 'active' : ''}`}
          onClick={() => handleModeChange('backoffice')}
          role="tab"
          aria-selected={mode === 'backoffice'}
        >
          <IconoBackoffice size={16} />
          <span>Backoffice (Admin / Org)</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* MODO 1: INICIO DE SESIÓN CLIENTES (PICA)                       */}
      {/* ============================================================== */}
      {mode === 'cliente' && (
        <div className="login-client-container">
          <div className="login-client-card">
            {/* Encabezado Institucional PICA */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.75rem' }}>
              <div
                className="pica-logo-badge hydra-logo-badge"
                style={{ width: '52px', height: '52px', fontSize: '1.65rem', borderRadius: '14px', marginBottom: '0.85rem' }}
              >
                P
              </div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '0.04em', margin: 0, color: 'var(--text-primary)' }}>
                PICA
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem', textAlign: 'center' }}>
                Plataforma Integral de Competencia Amateur
              </p>
            </div>

            {/* Segmented Control: Iniciar Sesión / Registrarse */}
            <div className="pica-segmented-control hydra-segmented-control" style={{ marginBottom: '1.5rem' }}>
              <button type="button" className="pica-segmented-tab hydra-segmented-tab active">
                Iniciar Sesión
              </button>
              <Link to="/auth/register" className="pica-segmented-tab hydra-segmented-tab">
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                  <IconoAlerta size={16} />
                  <strong>EMAIL_NO_VERIFICADO (403):</strong>
                </div>
                <div>{errorMessage}</div>
                <div style={{ marginTop: '0.5rem' }}>
                  <Link to="/auth/check-email" style={{ color: 'var(--brand-black)', fontWeight: 600, textDecoration: 'underline' }}>
                    Ir a pantalla de verificación →
                  </Link>
                </div>
              </div>
            )}

            {errorType === 'locked' && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.85rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.85rem', lineHeight: 1.4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <IconoAlerta size={16} />
                  <strong>USUARIO_BLOQUEADO (403):</strong>
                </div>
                <div style={{ marginTop: '0.25rem' }}>{errorMessage}</div>
              </div>
            )}

            {errorType === 'invalid' && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.85rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <IconoAlerta size={16} />
                <span>{errorMessage}</span>
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
                  Correo Electrónico o Usuario
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
                    width: '100%',
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
                      width: '100%',
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

            {/* Accesos rápidos para pruebas locales */}
            <div className="login-test-helper">
              <span>Usuarios de prueba para localhost:</span>
              <div className="login-test-chips">
                <button
                  type="button"
                  className="login-test-chip"
                  onClick={() => handleFillCredentials('usuario', 'user123')}
                >
                  usuario / user123
                </button>
                <button
                  type="button"
                  className="login-test-chip"
                  onClick={() => handleFillCredentials('dev_jugador1', 'PicaDev2026')}
                >
                  dev_jugador1 / PicaDev2026
                </button>
              </div>
            </div>

            {/* Switch al modo Backoffice */}
            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => handleModeChange('backoffice')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontWeight: 600,
                  padding: '0.4rem 0.8rem',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <IconoBackoffice size={15} />
                <span>¿Sos administrador u organizador? <strong style={{ color: 'var(--brand-black)' }}>Ir al Backoffice →</strong></span>
              </button>
            </div>

            {/* Footer Legal Notice */}
            <div style={{ marginTop: '1.75rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Al continuar, aceptas las Bases y Condiciones<br />
              <strong style={{ color: 'var(--text-primary)' }}>y la Política de Privacidad de PICA</strong>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODO 2: INGRESO BACKOFFICE (PICA)                             */}
      {/* ============================================================== */}
      {mode === 'backoffice' && (
        <div className="login-backoffice-container">
          <div className="login-backoffice-grid">
            {/* Columna Izquierda: Información de gestión y auditoría */}
            <div className="login-backoffice-hero">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    className="pica-logo-badge hydra-logo-badge"
                    style={{ width: '40px', height: '40px', fontSize: '1.3rem', borderRadius: '10px', background: '#ffffff', color: '#18181b' }}
                  >
                    P
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '0.04em', lineHeight: 1 }}>
                      PICA
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '0.2rem' }}>
                      Plataforma Integral de Competencia Amateur
                    </div>
                  </div>
                </div>

                <h2 className="login-backoffice-hero-title">
                  Panel de gestión para organizadores y administradores
                </h2>
                <p className="login-backoffice-hero-subtitle">
                  Billetera virtual, custodia de fondos, árbitros y auditoría SHA-256.
                </p>

                <div className="login-backoffice-features">
                  <div className="login-backoffice-feature-item">
                    <div className="login-backoffice-feature-icon">
                      <IconoEscudo size={20} />
                    </div>
                    <div>
                      <div className="login-backoffice-feature-title">Auditoría Criptográfica SHA-256</div>
                      <div className="login-backoffice-feature-desc">Sellado de actas arbitrales, brackets inmutables y trazabilidad de eventos.</div>
                    </div>
                  </div>

                  <div className="login-backoffice-feature-item">
                    <div className="login-backoffice-feature-icon">
                      <IconoBilletera size={20} />
                    </div>
                    <div>
                      <div className="login-backoffice-feature-title">Custodia de Fondos y Escrow</div>
                      <div className="login-backoffice-feature-desc">Control formal de pozos, rifas y liquidación automática a los ganadores.</div>
                    </div>
                  </div>

                  <div className="login-backoffice-feature-item">
                    <div className="login-backoffice-feature-icon">
                      <IconoUsuarios size={20} />
                    </div>
                    <div>
                      <div className="login-backoffice-feature-title">Gestión de Usuarios y Sanciones</div>
                      <div className="login-backoffice-feature-desc">Padrón de personas, asignación de roles y régimen disciplinario de bloqueo.</div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.15)', fontSize: '0.8rem', color: '#a1a1aa' }}>
                Sistema operativo en entorno oficial • Nodo activo
              </div>
            </div>

            {/* Columna Derecha: Tarjeta de Acceso Backoffice */}
            <div className="login-backoffice-form-col">
              <h3 className="login-backoffice-title">Ingresar al Backoffice</h3>
              <p className="login-backoffice-subtitle">
                Acceso restringido para personal autorizado de la plataforma.
              </p>

              {/* Selector de Rol: Organizador | Administrador */}
              <div className="login-role-selector" role="tablist">
                <button
                  type="button"
                  className={`login-role-tab ${backofficeRole === 'ORGANIZADOR' ? 'active' : ''}`}
                  onClick={() => handleBackofficeRoleTab('ORGANIZADOR')}
                >
                  <IconoRifas size={16} />
                  <span>Organizador</span>
                </button>
                <button
                  type="button"
                  className={`login-role-tab ${backofficeRole === 'ADMIN' ? 'active' : ''}`}
                  onClick={() => handleBackofficeRoleTab('ADMIN')}
                >
                  <IconoRoles size={16} />
                  <span>Administrador</span>
                </button>
              </div>

              {/* Alertas Contextuales */}
              {errorType === 'unverified' && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '0.85rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                    <IconoAlerta size={16} />
                    <strong>EMAIL_NO_VERIFICADO:</strong>
                  </div>
                  <div>{errorMessage}</div>
                </div>
              )}

              {errorType === 'locked' && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.85rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <IconoAlerta size={16} />
                    <strong>CUENTA_BLOQUEADA:</strong>
                  </div>
                  <div style={{ marginTop: '0.25rem' }}>{errorMessage}</div>
                </div>
              )}

              {errorType === 'invalid' && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.85rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <IconoAlerta size={16} />
                  <span>{errorMessage}</span>
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
                    Correo electrónico o usuario ({backofficeRole === 'ADMIN' ? 'Admin' : 'Organizador'})
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={backofficeRole === 'ADMIN' ? 'admin@pica.edu.ar o admin' : 'organizador@pica.edu.ar'}
                    value={identificador}
                    onChange={(e) => setIdentificador(e.target.value)}
                    style={{
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem 0.9rem',
                      width: '100%',
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
                        width: '100%',
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
                    ¿Olvidaste tu contraseña?
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
                  {loading ? 'Validando...' : 'Ingresar'}
                </button>
              </form>

              {/* Aviso de auditoría formal */}
              <div className="login-audit-notice">
                <IconoCandado size={16} />
                <span>Acceso restringido. Toda acción queda auditada bajo hash SHA-256 inmutable.</span>
              </div>

              {/* Accesos rápidos de desarrollo para localhost */}
              <div className="login-test-helper">
                <span>Credenciales de prueba:</span>
                <div className="login-test-chips">
                  <button
                    type="button"
                    className="login-test-chip"
                    onClick={() => handleFillCredentials('admin', 'admin123')}
                  >
                    admin / admin123
                  </button>
                  <button
                    type="button"
                    className="login-test-chip"
                    onClick={() => handleFillCredentials('organizador', 'org123')}
                  >
                    organizador / org123
                  </button>
                  <button
                    type="button"
                    className="login-test-chip"
                    onClick={() => handleFillCredentials('dev_organizador', 'PicaDev2026')}
                  >
                    dev_organizador (Seed)
                  </button>
                </div>
              </div>

              {/* Botón para volver al login de cliente */}
              <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => handleModeChange('cliente')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  ← ¿Sos jugador o participante? <strong style={{ color: 'var(--brand-black)' }}>Acceder como Cliente</strong>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
