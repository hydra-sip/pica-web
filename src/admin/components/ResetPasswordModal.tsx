import React, { useState } from 'react';
import { usuarioApi, UsuarioResumen } from '../../api/usuarioApi';
import { mensajeDeError } from '../../shared/mensajesError';

interface ResetPasswordModalProps {
  /** Nunca el propio: la clave propia se cambia desde Mi perfil (la tabla no lo deja abrir). */
  usuario: UsuarioResumen;
  onClose: () => void;
}

/** Resetear la clave de otro usuario a una temporal fuerte. */
export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ usuario, onClose }) => {
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [isResettingPass, setIsResettingPass] = useState(false);

  // Strong password validation regex: >=8 chars, >=1 uppercase, >=1 number
  const validateStrongPassword = (pass: string): boolean => {
    const regex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    return regex.test(pass);
  };

  // Save Reset Password (PUT /admin/usuarios/{id}/password with payload { password: "..." })
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!newPassword || usuario.protegido) return;

    if (!validateStrongPassword(newPassword)) {
      setPasswordError(
        'La contraseña debe tener al menos 8 caracteres, al menos una letra mayúscula y al menos un número.'
      );
      return;
    }

    setIsResettingPass(true);
    try {
      await usuarioApi.updatePassword(usuario.id, newPassword);
      setResetSuccess(`La contraseña para ${usuario.username} fue restablecida exitosamente.`);
      setTimeout(onClose, 1500);
    } catch (err) {
      setPasswordError(mensajeDeError(err, 'No se pudo resetear la contraseña.'));
    } finally {
      setIsResettingPass(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'var(--color-overlay)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width: '100%', maxWidth: '440px', padding: '1.75rem' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
          Resetear Contraseña (PUT /password)
        </h3>
        <p
          style={{
            fontSize: '0.85rem',
            color: 'var(--color-text-secondary)',
            marginBottom: '1rem',
          }}
        >
          Usuario: <strong>{usuario.username}</strong>
        </p>

        {resetSuccess && (
          <div
            style={{
              padding: '0.65rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-success-bg)',
              color: 'var(--color-success)',
              border: '1px solid var(--color-success-border)',
              marginBottom: '1rem',
              fontSize: '0.85rem',
            }}
          >
            {resetSuccess}
          </div>
        )}

        {passwordError && (
          <div
            style={{
              padding: '0.65rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              border: '1px solid var(--color-danger-border)',
              marginBottom: '1rem',
              fontSize: '0.85rem',
            }}
          >
            {passwordError}
          </div>
        )}

        <form
          onSubmit={handleResetPasswordSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              Nueva Contraseña Fuerte *
            </label>
            <input
              type="password"
              placeholder="Mínimo 8 caracteres, 1 mayúscula y 1 número..."
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setPasswordError(null);
              }}
              required
              style={{
                width: '100%',
                padding: '0.55rem',
                borderRadius: 'var(--radius-sm)',
                border: passwordError
                  ? '1px solid var(--color-danger)'
                  : '1px solid var(--color-border)',
                backgroundColor: 'var(--color-input-bg)',
                color: 'var(--color-text)',
                fontSize: '0.875rem',
              }}
            />
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
                marginTop: '0.2rem',
                display: 'block',
              }}
            >
              Requisito: Mínimo 8 caracteres, al menos 1 letra mayúscula y 1 número.
            </span>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              const randomPass = `Pica2026#${Math.floor(1000 + Math.random() * 9000)}`;
              setNewPassword(randomPass);
              setPasswordError(null);
            }}
            style={{ fontSize: '0.8rem', padding: '0.4rem' }}
          >
            Generar Clave Temporal Válida (ej: Pica2026#1234)
          </button>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '0.5rem',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isResettingPass}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={isResettingPass}>
              {isResettingPass ? 'Guardando...' : 'Cambiar Clave (PUT)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
