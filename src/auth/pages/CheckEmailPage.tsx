import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { authApi } from '../../api/authApi';
import { mensajeDeError } from '../../shared/mensajesError';
import { Badge, Button, Field, Input } from '../../shared/ui';
import { IconoCorreo } from '../../shared/ui/Iconos';
import { EstadoAuth } from '../components/EstadoAuth';

const ESPERA_REENVIO = 60;
const MOCKS_ACTIVOS = import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCKS !== 'false';

const reloj = (segundos: number) =>
  `${String(Math.floor(segundos / 60)).padStart(2, '0')}:${String(segundos % 60).padStart(2, '0')}`;

export const CheckEmailPage: React.FC = () => {
  const location = useLocation();
  // Viene del registro o del login con el mail; si se entra directo, se lo pide para reenviar
  const emailRecibido = (location.state as { email?: string } | null)?.email || '';
  const [email, setEmail] = useState(emailRecibido);
  const [espera, setEspera] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ tono: 'exito' | 'peligro'; texto: string } | null>(null);

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  const reenviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setEnviando(true);
    setAviso(null);
    try {
      await authApi.reenviarVerificacion(email.trim());
      setAviso({
        tono: 'exito',
        texto: 'Si el email está registrado y sin verificar, te llega un enlace nuevo.',
      });
      setEspera(ESPERA_REENVIO);
    } catch (err) {
      setAviso({ tono: 'peligro', texto: mensajeDeError(err, 'No se pudo reenviar el correo.') });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <EstadoAuth icono={<IconoCorreo />} titulo="Revisá tu correo">
      {emailRecibido ? (
        <p className="auth-estado-texto">
          Te mandamos un enlace de activación a:
          <br />
          <strong style={{ color: 'var(--color-text)' }}>{emailRecibido}</strong>
        </p>
      ) : (
        <p className="auth-estado-texto">Te mandamos un enlace de activación a tu correo.</p>
      )}

      <Badge>Estado: pendiente</Badge>

      <div className="alerta">
        <strong>¿Por qué me tengo que verificar?</strong>
        <br />
        Para inscribirte en torneos y comprar rifas tu cuenta tiene que estar activa. El enlace
        vence en 24 horas.
      </div>

      {aviso && (
        <div
          className={`alerta alerta-${aviso.tono}`}
          role={aviso.tono === 'peligro' ? 'alert' : 'status'}
        >
          {aviso.texto}
        </div>
      )}

      <form onSubmit={reenviar} className="auth-form">
        {!emailRecibido && (
          <Field label="Tu email">
            <Input
              type="email"
              required
              autoComplete="email"
              placeholder="ejemplo@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
        )}
        <Button type="submit" variant="secondary" block loading={enviando} disabled={espera > 0}>
          Reenviar correo de activación
        </Button>
        {espera > 0 && (
          <p className="auth-espera">Vas a poder pedir otro reenvío en {reloj(espera)}</p>
        )}
      </form>

      {MOCKS_ACTIVOS && (
        <div className="alerta alerta-info">
          <strong>Con los mocks:</strong>{' '}
          <Link to="/verificar?token=valid-demo-token-123">enlace válido</Link>
          {' · '}
          <Link to="/verificar?token=expired-token">enlace vencido</Link>
        </div>
      )}

      <Link to="/auth/login" className="auth-link">
        Volver al inicio de sesión
      </Link>
    </EstadoAuth>
  );
};
