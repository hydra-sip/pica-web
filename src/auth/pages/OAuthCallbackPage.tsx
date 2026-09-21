import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { authApi } from '../../api/authApi';
import { useAuth } from '../hooks/useAuth';

export const OAuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const navigate = useNavigate();
  const { loginWithTokens } = useAuth();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setLoading(false);
      setErrorMsg('No se recibió ningún código de autorización OAuth desde Google.');
      return;
    }

    setLoading(true);
    authApi
      .exchangeOAuthCode(code)
      .then((data) => {
        loginWithTokens(data.accessToken, data.refreshToken, data.user);
        
        // Redirección post-login según permisos/roles
        const isAdmin = data.user.role === 'ADMIN' || data.user.permissions?.includes('admin:access');
        const redirectPath = isAdmin ? '/admin' : '/';

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
  }, [code, loginWithTokens, navigate]);

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
