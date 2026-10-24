import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../../api/authApi';
import { mensajeDeError } from '../../shared/mensajesError';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const processedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setErrorMsg('No se proporcionó ningún token de verificación en la URL.');
      return;
    }

    // Prevenir doble ejecución en React 18 StrictMode
    if (processedTokenRef.current === token) {
      return;
    }
    processedTokenRef.current = token;

    setLoading(true);
    authApi
      .verifyEmail(token)
      .then(() => {
        setSuccess(true);
      })
      .catch((err) => {
        setSuccess(false);
        setErrorMsg(
          mensajeDeError(err, 'El enlace de verificación no es válido o venció.', {
            TOKEN_INVALIDO: 'El enlace de verificación no es válido.',
          })
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  return (
    <div style={{ maxWidth: '480px', margin: '3rem auto', textAlign: 'center' }} className="card">
      {loading ? (
        <div style={{ padding: '2rem 1rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⏳</div>
          <h2>Verificando tu cuenta...</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
            Por favor aguardá unos instantes mientras validamos tu token de seguridad con el servidor.
          </p>
        </div>
      ) : success ? (
        <div style={{ padding: '1rem 0' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem', color: 'var(--color-success)' }}>🎉</div>
          <h2 style={{ marginBottom: '0.75rem', color: 'var(--color-success)' }}>¡Verificación Exitosa!</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', marginBottom: '1.75rem' }}>
            Tu dirección de correo electrónico ha sido confirmada correctamente (HTTP 204). Ya podés iniciar sesión en PICA Web.
          </p>
          <Link to="/auth/login" className="btn btn-primary">
            Iniciar Sesión Ahora
          </Link>
        </div>
      ) : (
        <div style={{ padding: '1rem 0' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem', color: 'var(--color-danger)' }}>⚠️</div>
          <h2 style={{ marginBottom: '0.75rem', color: 'var(--color-danger)' }}>Error de Verificación</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', marginBottom: '1.75rem' }}>
            {errorMsg}
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link to="/auth/register" className="btn btn-secondary">
              Volver al Registro
            </Link>
            <Link to="/auth/login" className="btn btn-primary">
              Ir a Iniciar Sesión
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
