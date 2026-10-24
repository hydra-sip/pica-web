import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../../api/authApi';
import { codigoDeError, mensajeDeError } from '../../shared/mensajesError';
import { IconoAlerta, IconoEspera, IconoListo } from '../../shared/ui/Iconos';
import { EstadoAuth } from '../components/EstadoAuth';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Con un enlace vencido o inválido se ofrece pedir otro; si ya se usó, alcanza con ingresar
  const [puedePedirOtro, setPuedePedirOtro] = useState(true);
  const processedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setErrorMsg('El enlace no trae el código de verificación. Abrilo de nuevo desde el correo.');
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
        setPuedePedirOtro(codigoDeError(err) !== 'TOKEN_USADO');
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

  if (loading) {
    return (
      <EstadoAuth icono={<IconoEspera />} titulo="Verificando tu cuenta...">
        <p className="auth-estado-texto">Esto tarda unos segundos.</p>
      </EstadoAuth>
    );
  }

  if (success) {
    return (
      <EstadoAuth icono={<IconoListo />} titulo="¡Cuenta verificada!" tono="exito">
        <p className="auth-estado-texto">Ya podés iniciar sesión en PICA.</p>
        <div className="auth-estado-acciones">
          <Link to="/auth/login" className="btn btn-primary btn-block">
            Iniciar sesión
          </Link>
        </div>
      </EstadoAuth>
    );
  }

  return (
    <EstadoAuth icono={<IconoAlerta />} titulo="No pudimos verificar tu cuenta" tono="peligro">
      <p className="auth-estado-texto">{errorMsg}</p>
      <div className="auth-estado-acciones">
        {puedePedirOtro && (
          <Link to="/auth/check-email" className="btn btn-primary btn-block">
            Pedir un enlace nuevo
          </Link>
        )}
        <Link
          to="/auth/login"
          className={`btn btn-block ${puedePedirOtro ? 'btn-secondary' : 'btn-primary'}`}
        >
          Ir a iniciar sesión
        </Link>
      </div>
    </EstadoAuth>
  );
};
