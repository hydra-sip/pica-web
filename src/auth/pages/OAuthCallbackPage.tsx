import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
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
      setErrorMsg('No se recibió ningún código de autorización OAuth desde Google.');
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
        setErrorMsg(err.message || 'Error al completar la autenticación con Google.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [code, oauthError, loginWithOAuthCode, navigate]);

  return (
    <div style={{ maxWidth: '480px', margin: '3rem auto', textAlign: 'center' }} className="glass-card">
      {loading ? (
        <div style={{ padding: '2rem 1rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔄</div>
          <h2>Iniciando sesión con Google...</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Aguardá unos instantes mientras completamos la verificación de credenciales.
          </p>
        </div>
      ) : errorMsg ? (
        <div style={{ padding: '1rem 0' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem', color: '#f87171' }}>⚠️</div>
          <h2 style={{ marginBottom: '0.75rem', color: '#f87171' }}>Error de Autenticación OAuth</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.75rem' }}>
            {errorMsg}
          </p>
          <Link to="/auth/login" className="btn btn-primary">
            Volver a Iniciar Sesión
          </Link>
        </div>
      ) : (
        <div style={{ padding: '2rem 1rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', color: '#10b981' }}>✅</div>
          <h2>¡Autenticación Exitosa!</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Redirigiendo a tu panel...
          </p>
        </div>
      )}
    </div>
  );
};
