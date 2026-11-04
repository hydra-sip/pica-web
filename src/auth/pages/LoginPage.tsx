import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { codigoDeError, mensajeDeError } from '../../shared/mensajesError';
import { Button, Field, Input, InputClave } from '../../shared/ui';
import { AuthTarjeta } from '../components/AuthTarjeta';

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

  return (
    <AuthTarjeta>
      {errorMessage && (
        <div className={`alerta ${errorType === 'unverified' ? 'alerta-aviso' : 'alerta-peligro'}`} role="alert">
          {errorMessage}
          {errorType === 'unverified' && (
            <>
              {' '}
              <Link
                to="/auth/check-email"
                state={{ email: identificador.includes('@') ? identificador.trim() : undefined }}
              >
                Reenviar el correo
              </Link>
            </>
          )}
        </div>
      )}

      {successMsg && (
        <div className="alerta alerta-exito" role="status">
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        <Field label="Usuario o email">
          <Input
            type="text"
            required
            autoComplete="username"
            placeholder="ejemplo@correo.com"
            value={identificador}
            onChange={(e) => setIdentificador(e.target.value)}
          />
        </Field>

        <Field label="Contraseña">
          <InputClave
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <Button type="submit" block loading={loading}>
          {loading ? 'Ingresando...' : 'Ingresar'}
        </Button>
      </form>
    </AuthTarjeta>
  );
};
