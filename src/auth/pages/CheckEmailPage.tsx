import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

export const CheckEmailPage: React.FC = () => {
  const location = useLocation();
  const email = (location.state as { email?: string })?.email || 'salvador.baez@ejemplo.com';
  const [secondsLeft, setSecondsLeft] = useState(45);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (secondsLeft > 0) {
      const timer = setTimeout(() => setSecondsLeft(secondsLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [secondsLeft]);

  const handleResend = () => {
    if (secondsLeft > 0 || resending) return;
    setResending(true);
    setTimeout(() => {
      setResending(false);
      setResendSuccess(true);
      setSecondsLeft(60);
      setTimeout(() => setResendSuccess(false), 5000);
    }, 1000);
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ maxWidth: '420px', margin: '2rem auto', padding: '0 0.5rem' }}>
      <div className="hydra-card" style={{ padding: '2rem 1.75rem', textAlign: 'center' }}>
        {/* Header bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <Link
            to="/auth/login"
            style={{ color: 'var(--text-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', fontSize: '1.25rem' }}
            title="Volver"
          >
            ←
          </Link>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Verificación de Cuenta
          </h2>
          <div style={{ width: '20px' }} />
        </div>

        {/* Envelope Circle Icon */}
        <div
          style={{
            width: '90px',
            height: '90px',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '1.25rem auto 1.5rem',
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--brand-black)" strokeWidth="1.75">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        </div>

        {/* Title & Email */}
        <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Revisa tu correo
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
          Hemos enviado un enlace de activación a:
        </p>
        <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem', marginTop: '0.25rem', marginBottom: '1rem' }}>
          {email}
        </p>

        {/* Status Pill */}
        <div style={{ marginBottom: '1.5rem' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.9rem',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-surface)',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '0.04em',
            }}
          >
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#71717a' }}></span>
            ESTADO: PENDIENTE
          </span>
        </div>

        {/* Explanation Card */}
        <div
          style={{
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '1.1rem 1rem',
            textAlign: 'left',
            marginBottom: '1.5rem',
          }}
        >
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
            ¿Por qué debo verificarme?
          </h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0 }}>
            Para inscribirte en torneos, comprar rifas y acceder a tu billetera debes tener una cuenta activa. El token expira automáticamente en 24 horas.
          </p>
        </div>

        {resendSuccess && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '0.7rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.82rem' }}>
            ✓ Enlace de activación reenviado exitosamente
          </div>
        )}

        {/* Action Button */}
        <button
          type="button"
          onClick={handleResend}
          disabled={secondsLeft > 0 || resending}
          className="btn btn-outline-dark"
          style={{
            width: '100%',
            padding: '0.8rem',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
            fontSize: '0.9rem',
            marginBottom: '0.75rem',
          }}
        >
          {resending ? 'Reenviando...' : 'Reenviar Correo de Activación'}
        </button>

        {/* Countdown */}
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 1.5rem' }}>
          {secondsLeft > 0 ? `Podrás solicitar otro reenvío en ${formatTimer(secondsLeft)}` : 'Ya podés solicitar un nuevo reenvío'}
        </p>

        {/* Back Link */}
        <div>
          <Link
            to="/auth/login"
            style={{
              fontSize: '0.88rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              textDecoration: 'none',
            }}
          >
            Volver al inicio de sesión
          </Link>
        </div>

        {/* Demo Helper Links */}
        <div style={{ marginTop: '1.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <p style={{ margin: '0 0 0.35rem' }}>Pruebas de verificación rápida:</p>
          <Link to="/verificar?token=valid-demo-token-123" style={{ color: 'var(--text-secondary)', textDecoration: 'underline', marginRight: '0.75rem' }}>
            Token Válido
          </Link>
          <Link to="/verificar?token=expired-token" style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>
            Token Expirado
          </Link>
        </div>
      </div>
    </div>
  );
};
