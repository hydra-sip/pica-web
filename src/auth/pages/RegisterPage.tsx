import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/authApi';
import { FieldErrors } from '../types';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const navigate = useNavigate();

  const validateForm = (): boolean => {
    const errors: FieldErrors = {};

    if (!name.trim() || name.trim().length < 2) {
      errors.name = 'El nombre completo debe tener al menos 2 caracteres';
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!email.trim() || !emailRegex.test(email)) {
      errors.email = 'Ingresá un correo electrónico válido (ej: usuario@unlu.edu.ar)';
    }

    if (!password || password.length < 8) {
      errors.password = 'La contraseña debe tener al menos 8 caracteres';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await authApi.register({ name, email, password });
      // Redirigir a la vista "Revisá tu correo"
      navigate('/auth/check-email', { state: { email } });
    } catch (err: any) {
      const msg = err.message || 'Error al procesar el registro';

      // Captura y asociación de errores 409 Conflict o validaciones de campo
      if (
        msg.toLowerCase().includes('registrado') ||
        msg.toLowerCase().includes('existe') ||
        err.field === 'email'
      ) {
        setFieldErrors({
          email: msg.includes('409') || msg.includes('Conflict')
            ? 'Este correo electrónico ya se encuentra registrado'
            : msg,
        });
      } else {
        setGeneralError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '440px', margin: '2rem auto' }} className="glass-card">
      <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Crear Cuenta</h2>
      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Sumate a la plataforma PICA Web
      </p>

      {generalError && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.9rem' }}>
          {generalError}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
        {/* Campo Nombre Completo */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
            Nombre Completo
          </label>
          <input
            type="text"
            required
            placeholder="Juan Pérez"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
            }}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              border: fieldErrors.name ? '1px solid #f87171' : '1px solid var(--border-color)',
              backgroundColor: 'rgba(15, 23, 42, 0.7)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
          {fieldErrors.name && (
            <span style={{ color: '#f87171', fontSize: '0.8rem', marginTop: '0.35rem', display: 'block' }}>
              ⚠️ {fieldErrors.name}
            </span>
          )}
        </div>

        {/* Campo Correo Electrónico */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
            Correo Electrónico
          </label>
          <input
            type="email"
            required
            placeholder="usuario@unlu.edu.ar"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              border: fieldErrors.email ? '1px solid #f87171' : '1px solid var(--border-color)',
              backgroundColor: 'rgba(15, 23, 42, 0.7)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
          {fieldErrors.email && (
            <span style={{ color: '#f87171', fontSize: '0.8rem', marginTop: '0.35rem', display: 'block', fontWeight: 500 }}>
              ⚠️ {fieldErrors.email}
            </span>
          )}
        </div>

        {/* Campo Contraseña */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
            Contraseña
          </label>
          <input
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              border: fieldErrors.password ? '1px solid #f87171' : '1px solid var(--border-color)',
              backgroundColor: 'rgba(15, 23, 42, 0.7)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
          {fieldErrors.password && (
            <span style={{ color: '#f87171', fontSize: '0.8rem', marginTop: '0.35rem', display: 'block' }}>
              ⚠️ {fieldErrors.password}
            </span>
          )}
        </div>

        {/* Campo Confirmar Contraseña */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
            Confirmar Contraseña
          </label>
          <input
            type="password"
            required
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            }}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              border: fieldErrors.confirmPassword ? '1px solid #f87171' : '1px solid var(--border-color)',
              backgroundColor: 'rgba(15, 23, 42, 0.7)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
          {fieldErrors.confirmPassword && (
            <span style={{ color: '#f87171', fontSize: '0.8rem', marginTop: '0.35rem', display: 'block' }}>
              ⚠️ {fieldErrors.confirmPassword}
            </span>
          )}
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '0.5rem' }}>
          {loading ? 'Creando cuenta...' : 'Registrarse'}
        </button>
      </form>

      <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <p style={{ marginBottom: '0.25rem' }}>Para probar error 409 Conflict:</p>
        Probá registrarte con <code>existente@pica.edu.ar</code>
      </div>
    </div>
  );
};
