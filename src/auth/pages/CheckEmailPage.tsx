import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export const CheckEmailPage: React.FC = () => {
  const location = useLocation();
  const email = (location.state as { email?: string })?.email || 'tu casilla de correo';

  return (
    <div style={{ maxWidth: '480px', margin: '3rem auto', textAlign: 'center' }} className="glass-card">
      <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>✉️</div>
      <h2 style={{ marginBottom: '0.75rem' }}>¡Revisá tu correo electrónico!</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
        Hemos enviado un enlace de verificación a <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.
        Por favor, hacé clic en el enlace para activar tu cuenta e iniciar sesión en PICA Web.
      </p>

      <div
        style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          padding: '1rem',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          marginBottom: '1.5rem',
          textAlign: 'left',
        }}
      >
        <p style={{ margin: 0, fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '0.35rem' }}>
          💡 Para pruebas en entorno local:
        </p>
        <p style={{ margin: 0 }}>
          Podés simular la verificación con un token válido haciendo clic abajo:
        </p>
        <div style={{ marginTop: '0.5rem' }}>
          <Link
            to="/verificar?token=valid-demo-token-123"
            style={{ color: 'var(--accent-teal)', textDecoration: 'underline', fontWeight: 500 }}
          >
            👉 Probar Verificación con Token Válido
          </Link>
          <br />
          <Link
            to="/verificar?token=expired-token"
            style={{ color: '#f87171', textDecoration: 'underline', fontWeight: 500, fontSize: '0.8rem', marginTop: '0.25rem', display: 'inline-block' }}
          >
            👉 Probar Token Expirado/Inválido
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
        <Link to="/auth/login" className="btn btn-secondary">
          Ir a Iniciar Sesión
        </Link>
      </div>
    </div>
  );
};
