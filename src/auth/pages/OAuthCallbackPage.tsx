import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { mensajeDeError } from '../../shared/mensajesError';
import { IconoAlerta, IconoEspera, IconoListo } from '../../shared/ui/Iconos';
import { EstadoAuth } from '../components/EstadoAuth';
import { useAuth } from '../hooks/useAuth';

// El back vuelve con ?error=<CODIGO> cuando el login con Google falla antes del canje (ver /auth/exchange)
const ERRORES_GOOGLE: Record<string, string> = {
  NO_AUTENTICADO: 'No se completó el inicio de sesión con Google.',
  EMAIL_NO_VERIFICADO: 'Google no verificó el email de tu cuenta.',
  CREDENCIALES_INVALIDAS: 'Tu usuario ya está vinculado a otra cuenta de Google.',
  EMAIL_DUPLICADO: 'Ese email es de un usuario dado de baja. Por favor, contactá al administrador.',
};

export const OAuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const oauthError = searchParams.get('error');
  const navigate = useNavigate();
  const { loginWithOAuthCode } = useAuth();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const processedCodeRef = useRef<string | null>(null);

  useEffect(() => {
    if (oauthError) {
      setLoading(false);
      setErrorMsg(ERRORES_GOOGLE[oauthError] ?? 'No se pudo completar el inicio de sesión con Google.');
      return;
    }

    if (!code) {
      setLoading(false);
      setErrorMsg('Google no devolvió el código de ingreso. Probá de nuevo.');
      return;
    }

    // Prevenir doble ejecución en React 18 StrictMode (código de un solo uso)
    if (processedCodeRef.current === code) {
      return;
    }
    processedCodeRef.current = code;

    setLoading(true);
    loginWithOAuthCode(code)
      .then((user) => {
        // Redirección post-login según permisos/roles
        const userRoles = user.roles?.map((r) => r.nombre) || [];
        const hasAdminAccess =
          userRoles.includes('ADMINISTRADOR') ||
          userRoles.includes('SUPER_USUARIO') ||
          user.permisos?.includes('USUARIO_VER') ||
          user.permisos?.includes('ROL_VER') ||
          user.permisos?.includes('PERSONA_VER');

        const redirectPath = hasAdminAccess ? '/admin' : '/';

        setTimeout(() => {
          navigate(redirectPath, { replace: true });
        }, 600);
      })
      .catch((err) => {
        setErrorMsg(mensajeDeError(err, 'No se pudo terminar el ingreso con Google.'));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [code, oauthError, loginWithOAuthCode, navigate]);

  if (loading) {
    return (
      <EstadoAuth icono={<IconoEspera />} titulo="Ingresando con Google...">
        <p className="auth-estado-texto">Esto tarda unos segundos.</p>
      </EstadoAuth>
    );
  }

  if (errorMsg) {
    return (
      <EstadoAuth icono={<IconoAlerta />} titulo="No pudimos ingresar con Google" tono="peligro">
        <p className="auth-estado-texto">{errorMsg}</p>
        <div className="auth-estado-acciones">
          <Link to="/auth/login" className="btn btn-primary btn-block">
            Volver a iniciar sesión
          </Link>
        </div>
      </EstadoAuth>
    );
  }

  return (
    <EstadoAuth icono={<IconoListo />} titulo="¡Listo!" tono="exito">
      <p className="auth-estado-texto">Te estamos llevando a tu panel...</p>
    </EstadoAuth>
  );
};
