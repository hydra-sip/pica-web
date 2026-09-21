import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/authApi';
import { FieldErrors } from '../types';
import { ApiError } from '../../api/httpClient';

export const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [tipoDoc, setTipoDoc] = useState('DNI');
  const [nroDoc, setNroDoc] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');

  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const navigate = useNavigate();

  const validateForm = (): boolean => {
    const errors: FieldErrors = {};

    if (!username.trim() || username.trim().length < 3) {
      errors.username = 'El nombre de usuario debe tener al menos 3 caracteres';
    }

    if (!nombres.trim()) {
      errors.nombres = 'Ingresá tu nombre';
    }

    if (!apellidos.trim()) {
      errors.apellidos = 'Ingresá tu apellido';
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
      await authApi.register({
        username,
        email,
        password,
        nombres,
        apellidos,
        tipoDoc,
        nroDoc,
        fechaNacimiento,
      });

      // Redirigir a la vista "Revisá tu correo"
      navigate('/auth/check-email', { state: { email } });
    } catch (err: any) {
      if (err instanceof ApiError && err.problemDetail) {
        const pd = err.problemDetail;
        const newFieldErrors: FieldErrors = {};

        // Parse 400 VALIDACION errores[]
        if (pd.errores && Array.isArray(pd.errores)) {
          pd.errores.forEach((item) => {
            if (item.campo) {
              (newFieldErrors as any)[item.campo] = item.mensaje;
            }
          });
        }

        // Parse 409 Conflict codes
        if (pd.codigo === 'USERNAME_DUPLICADO') {
          newFieldErrors.username = pd.detail || 'El nombre de usuario ya se encuentra registrado';
        } else if (pd.codigo === 'EMAIL_DUPLICADO') {
          newFieldErrors.email = pd.detail || 'Este correo electrónico ya se encuentra registrado';
        }

        if (Object.keys(newFieldErrors).length > 0) {
          setFieldErrors(newFieldErrors);
        } else {
          setGeneralError(pd.detail || pd.codigo || 'Error al procesar el registro');
        }
      } else {
        setGeneralError(err.message || 'Error al procesar el registro');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '540px', margin: '2rem auto' }} className="glass-card">
      <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Crear Cuenta</h2>
      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Sumate a la plataforma PICA Web
      </p>

      {generalError && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.9rem' }}>
          {generalError}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Nombres y Apellidos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
              Nombre/s <span style={{ color: '#f87171' }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Juan"
              value={nombres}
              onChange={(e) => setNombres(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: fieldErrors.nombres ? '1px solid #f87171' : '1px solid var(--border-color)',
                backgroundColor: 'rgba(15, 23, 42, 0.7)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
            {fieldErrors.nombres && <span style={{ color: '#f87171', fontSize: '0.78rem', marginTop: '0.2rem', display: 'block' }}>⚠️ {fieldErrors.nombres}</span>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
              Apellido/s <span style={{ color: '#f87171' }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Pérez"
              value={apellidos}
              onChange={(e) => setApellidos(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: fieldErrors.apellidos ? '1px solid #f87171' : '1px solid var(--border-color)',
                backgroundColor: 'rgba(15, 23, 42, 0.7)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
            {fieldErrors.apellidos && <span style={{ color: '#f87171', fontSize: '0.78rem', marginTop: '0.2rem', display: 'block' }}>⚠️ {fieldErrors.apellidos}</span>}
          </div>
        </div>

        {/* Username y Email */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
              Nombre de Usuario <span style={{ color: '#f87171' }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="juanperez"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: fieldErrors.username ? '1px solid #f87171' : '1px solid var(--border-color)',
                backgroundColor: 'rgba(15, 23, 42, 0.7)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
            {fieldErrors.username && <span style={{ color: '#f87171', fontSize: '0.78rem', marginTop: '0.2rem', display: 'block' }}>⚠️ {fieldErrors.username}</span>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
              Correo Electrónico <span style={{ color: '#f87171' }}>*</span>
            </label>
            <input
              type="email"
              required
              placeholder="juan@unlu.edu.ar"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            {fieldErrors.email && <span style={{ color: '#f87171', fontSize: '0.78rem', marginTop: '0.2rem', display: 'block' }}>⚠️ {fieldErrors.email}</span>}
          </div>
        </div>

        {/* Documento y Fecha Nacimiento */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
              Tipo Doc
            </label>
            <select
              value={tipoDoc}
              onChange={(e) => setTipoDoc(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            >
              <option value="DNI">DNI</option>
              <option value="CUIL">CUIL</option>
              <option value="PASAPORTE">Pasaporte</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
              Nro Documento
            </label>
            <input
              type="text"
              placeholder="38123456"
              value={nroDoc}
              onChange={(e) => setNroDoc(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'rgba(15, 23, 42, 0.7)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
              Nacimiento
            </label>
            <input
              type="date"
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'rgba(15, 23, 42, 0.7)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Contraseñas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
              Contraseña <span style={{ color: '#f87171' }}>*</span>
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {fieldErrors.password && <span style={{ color: '#f87171', fontSize: '0.78rem', marginTop: '0.2rem', display: 'block' }}>⚠️ {fieldErrors.password}</span>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
              Confirmar Contraseña <span style={{ color: '#f87171' }}>*</span>
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {fieldErrors.confirmPassword && <span style={{ color: '#f87171', fontSize: '0.78rem', marginTop: '0.2rem', display: 'block' }}>⚠️ {fieldErrors.confirmPassword}</span>}
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '0.5rem' }}>
          {loading ? 'Procesando registro...' : 'Registrarse'}
        </button>
      </form>

      <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        ¿Ya tenés una cuenta? <Link to="/auth/login" style={{ color: 'var(--accent-secondary)' }}>Iniciar Sesión</Link>
      </div>
    </div>
  );
};
