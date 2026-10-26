import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/authApi';
import { FieldErrors } from '../types';
import { ApiError, API_BASE_URL } from '../../api/httpClient';
import { PasswordRequirements } from '../components/PasswordRequirements';
import {
  TIPOS_DOC_VALIDOS,
  validateNombreApellido,
  validateDocumento,
  validateFechaNacimiento,
  validatePasswordRequirements,
  getTodayDateString,
  MIN_FECHA_NACIMIENTO,
} from '../../shared/validators';
import { IconoAlerta } from '../../shared/ui/Iconos';

export const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [aceptaTerminos, setAceptaTerminos] = useState(false);

  const [terminosError, setTerminosError] = useState<string | null>(null);

  const [tipoDoc, setTipoDoc] = useState('DNI');
  const [nroDoc, setNroDoc] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');

  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const navigate = useNavigate();

  const validateForm = (): boolean => {
    const errors: FieldErrors = {};
    setTerminosError(null);

    const cleanUsername = username.trim();
    if (!cleanUsername || cleanUsername.length < 3) {
      errors.username = 'El nombre de usuario debe tener al menos 3 caracteres';
    } else if (cleanUsername.length > 30) {
      errors.username = 'El nombre de usuario no puede superar los 30 caracteres';
    } else if (!/^[a-zA-Z0-9._-]+$/.test(cleanUsername)) {
      errors.username = 'Solo se permiten letras, números, puntos, guiones y guiones bajos';
    }

    const errNombres = validateNombreApellido(nombres, 'El nombre', true);
    if (errNombres) {
      errors.nombres = errNombres;
    }

    const errApellidos = validateNombreApellido(apellidos, 'El apellido', true);
    if (errApellidos) {
      errors.apellidos = errApellidos;
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!email.trim() || !emailRegex.test(email)) {
      errors.email = 'Ingresá un correo electrónico válido (ej: usuario@correo.com)';
    } else if (email.trim().length > 254) {
      errors.email = 'El correo electrónico no puede superar los 254 caracteres';
    }

    const errDoc = validateDocumento(nroDoc, tipoDoc, true);
    if (errDoc) {
      errors.nroDoc = errDoc;
    }

    const errFecha = validateFechaNacimiento(fechaNacimiento, true);
    if (errFecha) {
      errors.fechaNacimiento = errFecha;
    }

    const pwdValidation = validatePasswordRequirements(password);
    if (!pwdValidation.isValid) {
      errors.password = pwdValidation.errorMessage;
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirmá tu contraseña';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden';
    }

    let valid = Object.keys(errors).length === 0;

    if (!aceptaTerminos) {
      setTerminosError('Debes aceptar las Bases y Condiciones para continuar');
      valid = false;
    }

    setFieldErrors(errors);
    return valid;
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
        username: username.trim(),
        email: email.trim(),
        password,
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        tipoDoc,
        nroDoc: nroDoc.trim(),
        fechaNacimiento,
      });

      // Redirigir a la vista "Revisá tu correo"
      navigate('/auth/check-email', { state: { email: email.trim() } });
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
        } else if (pd.codigo === 'DOCUMENTO_DUPLICADO') {
          newFieldErrors.nroDoc = pd.detail || 'Ya existe un usuario con este documento';
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

  const handleGoogleLogin = () => {
    const backendRoot = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
    window.location.href = `${backendRoot}/oauth2/authorization/google`;
  };

  return (
    <div style={{ maxWidth: '480px', margin: '2rem auto', padding: '0 0.5rem' }}>
      <div className="pica-card hydra-card" style={{ padding: '2.25rem 2rem' }}>
        {/* Logo and Brand Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.75rem' }}>
          <div
            className="pica-logo-badge hydra-logo-badge"
            style={{ width: '52px', height: '52px', fontSize: '1.65rem', borderRadius: '14px', marginBottom: '0.85rem' }}
          >
            P
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '0.04em', margin: 0, color: 'var(--text-primary)' }}>
            PICA
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem', textAlign: 'center' }}>
            Plataforma Integral de Competencia Amateur
          </p>
        </div>

        {/* Segmented Control: Iniciar Sesión / Registrarse */}
        <div className="pica-segmented-control hydra-segmented-control" style={{ marginBottom: '1.5rem' }}>
          <Link to="/auth/login" className="pica-segmented-tab hydra-segmented-tab">
            Iniciar Sesión
          </Link>
          <button type="button" className="pica-segmented-tab hydra-segmented-tab active">
            Registrarse
          </button>
        </div>

        {/* Botón Google OAuth2 */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: 'var(--shadow-xs)',
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          Continuar con Google
        </button>

        {/* Separador Visual */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '1.25rem 0', gap: '0.75rem' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>o con email</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
        </div>

        {generalError && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              padding: '0.85rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1rem',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
            }}
          >
            <IconoAlerta size={16} />
            <span>{generalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Nombres y Apellidos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Nombre/s <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Juan"
                value={nombres}
                onChange={(e) => {
                  setNombres(e.target.value);
                  if (fieldErrors.nombres) setFieldErrors((prev) => ({ ...prev, nombres: undefined }));
                }}
                style={{ borderColor: fieldErrors.nombres ? '#ef4444' : undefined }}
              />
              {fieldErrors.nombres && (
                <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <IconoAlerta size={13} /> {fieldErrors.nombres}
                </span>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Apellido/s <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Pérez"
                value={apellidos}
                onChange={(e) => {
                  setApellidos(e.target.value);
                  if (fieldErrors.apellidos) setFieldErrors((prev) => ({ ...prev, apellidos: undefined }));
                }}
                style={{ borderColor: fieldErrors.apellidos ? '#ef4444' : undefined }}
              />
              {fieldErrors.apellidos && (
                <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <IconoAlerta size={13} /> {fieldErrors.apellidos}
                </span>
              )}
            </div>
          </div>

          {/* Username */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Nombre de usuario <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="juanperez"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (fieldErrors.username) setFieldErrors((prev) => ({ ...prev, username: undefined }));
              }}
              style={{ borderColor: fieldErrors.username ? '#ef4444' : undefined }}
            />
            {fieldErrors.username && (
              <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <IconoAlerta size={13} /> {fieldErrors.username}
              </span>
            )}
          </div>

          {/* Correo Electrónico */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Correo Electrónico <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="email"
              required
              placeholder="juan@correo.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }}
              style={{ borderColor: fieldErrors.email ? '#ef4444' : undefined }}
            />
            {fieldErrors.email && (
              <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <IconoAlerta size={13} /> {fieldErrors.email}
              </span>
            )}
          </div>

          {/* Tipo Doc, Nro Doc y Fecha Nac */}
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Tipo
              </label>
              <select
                value={tipoDoc}
                onChange={(e) => setTipoDoc(e.target.value)}
                style={{ padding: '0.7rem 0.5rem' }}
              >
                {TIPOS_DOC_VALIDOS.map((td) => (
                  <option key={td.value} value={td.value}>{td.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Nro Documento <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                required
                placeholder="38123456"
                value={nroDoc}
                onChange={(e) => {
                  setNroDoc(e.target.value);
                  if (fieldErrors.nroDoc) setFieldErrors((prev) => ({ ...prev, nroDoc: undefined }));
                }}
                style={{ borderColor: fieldErrors.nroDoc ? '#ef4444' : undefined }}
              />
              {fieldErrors.nroDoc && (
                <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <IconoAlerta size={13} /> {fieldErrors.nroDoc}
                </span>
              )}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Fecha de Nacimiento <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="date"
              required
              min={MIN_FECHA_NACIMIENTO}
              max={getTodayDateString()}
              value={fechaNacimiento}
              onChange={(e) => {
                setFechaNacimiento(e.target.value);
                if (fieldErrors.fechaNacimiento) setFieldErrors((prev) => ({ ...prev, fechaNacimiento: undefined }));
              }}
              style={{ borderColor: fieldErrors.fechaNacimiento ? '#ef4444' : undefined }}
            />
            {fieldErrors.fechaNacimiento && (
              <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <IconoAlerta size={13} /> {fieldErrors.fechaNacimiento}
              </span>
            )}
          </div>

          {/* Contraseñas */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Contraseña <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
              style={{ borderColor: fieldErrors.password ? '#ef4444' : undefined }}
            />
            <PasswordRequirements password={password} />
            {fieldErrors.password && (
              <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <IconoAlerta size={13} /> {fieldErrors.password}
              </span>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Confirmar contraseña <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
              }}
              style={{ borderColor: fieldErrors.confirmPassword ? '#ef4444' : undefined }}
            />
            {fieldErrors.confirmPassword && (
              <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <IconoAlerta size={13} /> {fieldErrors.confirmPassword}
              </span>
            )}
          </div>

          {/* Checkbox Aceptar Términos */}
          <div style={{ marginTop: '0.25rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={aceptaTerminos}
                onChange={(e) => {
                  setAceptaTerminos(e.target.checked);
                  if (terminosError) setTerminosError(null);
                }}
                style={{ width: '16px', height: '16px', accentColor: 'var(--brand-black)', cursor: 'pointer' }}
              />
              Acepto las Bases y Condiciones
            </label>
            {terminosError && (
              <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <IconoAlerta size={13} /> {terminosError}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              padding: '0.85rem',
              fontSize: '0.95rem',
              fontWeight: 700,
              marginTop: '0.5rem',
              width: '100%',
              borderRadius: 'var(--radius-md)',
            }}
          >
            {loading ? 'Creando cuenta...' : 'Registrarse'}
          </button>
        </form>

        {/* Footer Legal Notice */}
        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Al continuar, aceptas las Bases y Condiciones<br />
          <strong style={{ color: 'var(--text-primary)' }}>y la Política de Privacidad de PICA</strong>
        </div>
      </div>
    </div>
  );
};
