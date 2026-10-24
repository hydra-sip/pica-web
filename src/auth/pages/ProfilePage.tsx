import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../../api/authApi';
import { erroresDelFormulario, mensajeDeError } from '../../shared/mensajesError';
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

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();

  // Profile data form state according to openapi.yaml
  const [nombres, setNombres] = useState(user?.persona?.nombres || user?.name || '');
  const [apellidos, setApellidos] = useState(user?.persona?.apellidos || '');
  const [email] = useState(user?.email || '');
  const [tipoDoc, setTipoDoc] = useState(user?.persona?.tipoDoc || 'DNI');
  const [nroDoc, setNroDoc] = useState(user?.persona?.nroDoc || user?.documento || '');
  const [fechaNacimiento, setFechaNacimiento] = useState(user?.persona?.fechaNacimiento || '');
  const [domicilioPostal, setDomicilioPostal] = useState(
    user?.persona?.domicilioPostal || user?.domicilioPostal || ''
  );
  const [telefono, setTelefono] = useState(user?.persona?.telefono || user?.telefono || '');

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);
  const [profileFieldErrors, setProfileFieldErrors] = useState<Record<string, string>>({});

  // Password change form state according to openapi.yaml
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(null);
  const [passwordErrorMsg, setPasswordErrorMsg] = useState<string | null>(null);
  const [passwordFieldErrors, setPasswordFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setNombres(user.persona?.nombres || user.name || '');
      setApellidos(user.persona?.apellidos || '');
      setTipoDoc(user.persona?.tipoDoc || 'DNI');
      setNroDoc(user.persona?.nroDoc || user.documento || '');
      setFechaNacimiento(user.persona?.fechaNacimiento || '');
      setDomicilioPostal(user.persona?.domicilioPostal || user.domicilioPostal || '');
      setTelefono(user.persona?.telefono || user.telefono || '');
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);
    setProfileFieldErrors({});

    const errors: Record<string, string> = {};

    const errNombres = validateNombreApellido(nombres, 'El nombre', true);
    if (errNombres) errors.nombres = errNombres;

    const errApellidos = validateNombreApellido(apellidos, 'El apellido', true);
    if (errApellidos) errors.apellidos = errApellidos;

    if (nroDoc && nroDoc.trim()) {
      const errDoc = validateDocumento(nroDoc, tipoDoc, true);
      if (errDoc) errors.nroDoc = errDoc;
    }

    if (fechaNacimiento && fechaNacimiento.trim()) {
      const errFecha = validateFechaNacimiento(fechaNacimiento, false);
      if (errFecha) errors.fechaNacimiento = errFecha;
    }

    if (Object.keys(errors).length > 0) {
      setProfileFieldErrors(errors);
      setSavingProfile(false);
      return;
    }

    try {
      const updatedUser = await authApi.updateProfile({
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        tipoDoc,
        nroDoc: nroDoc.trim() || undefined,
        fechaNacimiento: fechaNacimiento || undefined,
        domicilioPostal: domicilioPostal.trim() || undefined,
        telefono: telefono.trim() || undefined,
      });
      updateUser(updatedUser);
      setProfileSuccessMsg('¡Datos de perfil guardados correctamente!');
    } catch (err) {
      const newFieldErrors = erroresDelFormulario(err, {
        DOCUMENTO_DUPLICADO: 'nroDoc',
        DOCUMENTO_NO_EDITABLE: 'nroDoc',
      });
      if (Object.keys(newFieldErrors).length > 0) {
        setProfileFieldErrors(newFieldErrors);
      } else {
        setProfileErrorMsg(mensajeDeError(err, 'No se pudo actualizar el perfil.'));
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccessMsg(null);
    setPasswordErrorMsg(null);
    setPasswordFieldErrors({});

    const errors: Record<string, string> = {};

    if (!passwordActual) {
      errors.passwordActual = 'Ingresá tu contraseña actual.';
    }

    const pwdRes = validatePasswordRequirements(passwordNueva);
    if (!pwdRes.isValid) {
      errors.passwordNueva =
        pwdRes.errorMessage || 'La contraseña no cumple con los requisitos de seguridad.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirmá tu nueva contraseña.';
    } else if (passwordNueva !== confirmPassword) {
      errors.confirmPassword = 'La confirmación de la nueva contraseña no coincide.';
    }

    if (Object.keys(errors).length > 0) {
      setPasswordFieldErrors(errors);
      return;
    }

    setChangingPassword(true);

    try {
      const res = await authApi.changePassword({ passwordActual, passwordNueva });
      setPasswordSuccessMsg(res.message || 'Contraseña actualizada exitosamente.');
      setPasswordActual('');
      setPasswordNueva('');
      setConfirmPassword('');
    } catch (err) {
      const errs = erroresDelFormulario(err, { PASSWORD_ACTUAL_INCORRECTA: 'passwordActual' });
      if (Object.keys(errs).length > 0) {
        setPasswordFieldErrors(errs);
      } else {
        setPasswordErrorMsg(mensajeDeError(err, 'No se pudo cambiar la contraseña.'));
      }
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: '720px',
        margin: '2rem auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
      }}
    >
      <div>
        <span className="badge">Configuración de Cuenta</span>
        <h1 style={{ marginTop: '0.5rem' }}>Mi Perfil</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Gestioná tu información personal y la seguridad de tu acceso según la especificación del
          sistema.
        </p>
      </div>

      {user && user.datosCompletos === false && (
        <div
          style={{
            background: 'var(--color-warning-bg)',
            border: '1px solid var(--color-warning-border)',
            color: 'var(--color-warning)',
            padding: '1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.9rem',
            lineHeight: 1.5,
          }}
        >
          <strong>⚠️ Completá tu perfil:</strong> Por favor, ingresá tu <strong>Documento</strong>,{' '}
          <strong>Fecha de Nacimiento</strong>, <strong>Domicilio Postal</strong> y{' '}
          <strong>Teléfono</strong> para habilitar todas las funciones operativas de la plataforma.
        </div>
      )}

      {/* Sección 1: Datos Personales */}
      <div className="card">
        <h3
          style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          👤 Datos Personales
        </h3>

        {profileSuccessMsg && (
          <div
            style={{
              background: 'var(--color-success-bg)',
              border: '1px solid var(--color-success-border)',
              color: 'var(--color-success)',
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.25rem',
              fontSize: '0.88rem',
            }}
          >
            {profileSuccessMsg}
          </div>
        )}

        {profileErrorMsg && (
          <div
            style={{
              background: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger-border)',
              color: 'var(--color-danger)',
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.25rem',
              fontSize: '0.88rem',
            }}
          >
            {profileErrorMsg}
          </div>
        )}

        <form
          onSubmit={handleUpdateProfile}
          noValidate
          style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.1rem',
              alignItems: 'start',
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  marginBottom: '0.35rem',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Nombres <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={nombres}
                onChange={(e) => {
                  setNombres(e.target.value);
                  if (profileFieldErrors.nombres) {
                    setProfileFieldErrors((prev) => ({ ...prev, nombres: undefined as any }));
                  }
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: profileFieldErrors.nombres
                    ? '1px solid var(--color-danger)'
                    : '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-input-bg)',
                  color: 'var(--color-text)',
                  outline: 'none',
                }}
              />
              {profileFieldErrors.nombres && (
                <span
                  style={{
                    color: 'var(--color-danger)',
                    fontSize: '0.78rem',
                    marginTop: '0.2rem',
                    display: 'block',
                  }}
                >
                  ⚠️ {profileFieldErrors.nombres}
                </span>
              )}
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  marginBottom: '0.35rem',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Apellidos <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={apellidos}
                onChange={(e) => {
                  setApellidos(e.target.value);
                  if (profileFieldErrors.apellidos) {
                    setProfileFieldErrors((prev) => ({ ...prev, apellidos: undefined as any }));
                  }
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: profileFieldErrors.apellidos
                    ? '1px solid var(--color-danger)'
                    : '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-input-bg)',
                  color: 'var(--color-text)',
                  outline: 'none',
                }}
              />
              {profileFieldErrors.apellidos && (
                <span
                  style={{
                    color: 'var(--color-danger)',
                    fontSize: '0.78rem',
                    marginTop: '0.2rem',
                    display: 'block',
                  }}
                >
                  ⚠️ {profileFieldErrors.apellidos}
                </span>
              )}
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  marginBottom: '0.35rem',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Correo Electrónico (No editable)
              </label>
              <input
                type="email"
                disabled
                value={email}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text-muted)',
                  cursor: 'not-allowed',
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  marginBottom: '0.35rem',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Tipo de Documento
              </label>
              <select
                value={tipoDoc}
                onChange={(e) => {
                  const nuevoTipo = e.target.value;
                  setTipoDoc(nuevoTipo);
                  if (nroDoc.trim()) {
                    const err = validateDocumento(nroDoc, nuevoTipo, true);
                    setProfileFieldErrors((prev) => ({
                      ...prev,
                      nroDoc: err || (undefined as any),
                    }));
                  }
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-input-bg)',
                  color: 'var(--color-text)',
                  outline: 'none',
                }}
              >
                {TIPOS_DOC_VALIDOS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  marginBottom: '0.35rem',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Nro Documento <span style={{ color: 'var(--color-warning)' }}>*</span>
              </label>
              <input
                type="text"
                required
                placeholder={
                  tipoDoc === 'DNI' || tipoDoc === 'LC' || tipoDoc === 'LE'
                    ? 'ej: 38123456'
                    : 'ej: A1234567'
                }
                value={nroDoc}
                onChange={(e) => {
                  setNroDoc(e.target.value);
                  if (profileFieldErrors.nroDoc) {
                    setProfileFieldErrors((prev) => ({ ...prev, nroDoc: undefined as any }));
                  }
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: profileFieldErrors.nroDoc
                    ? '1px solid var(--color-danger)'
                    : !nroDoc
                      ? '1px solid var(--color-warning-border)'
                      : '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-input-bg)',
                  color: 'var(--color-text)',
                  outline: 'none',
                }}
              />
              {profileFieldErrors.nroDoc && (
                <span
                  style={{
                    color: 'var(--color-danger)',
                    fontSize: '0.78rem',
                    marginTop: '0.2rem',
                    display: 'block',
                  }}
                >
                  ⚠️ {profileFieldErrors.nroDoc}
                </span>
              )}
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  marginBottom: '0.35rem',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Fecha de Nacimiento <span style={{ color: 'var(--color-warning)' }}>*</span>
              </label>
              <input
                type="date"
                required
                min={MIN_FECHA_NACIMIENTO}
                max={getTodayDateString()}
                value={fechaNacimiento}
                onChange={(e) => {
                  setFechaNacimiento(e.target.value);
                  if (profileFieldErrors.fechaNacimiento) {
                    setProfileFieldErrors((prev) => ({
                      ...prev,
                      fechaNacimiento: undefined as any,
                    }));
                  }
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: profileFieldErrors.fechaNacimiento
                    ? '1px solid var(--color-danger)'
                    : !fechaNacimiento
                      ? '1px solid var(--color-warning-border)'
                      : '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-input-bg)',
                  color: 'var(--color-text)',
                  outline: 'none',
                }}
              />
              {profileFieldErrors.fechaNacimiento && (
                <span
                  style={{
                    color: 'var(--color-danger)',
                    fontSize: '0.78rem',
                    marginTop: '0.2rem',
                    display: 'block',
                  }}
                >
                  ⚠️ {profileFieldErrors.fechaNacimiento}
                </span>
              )}
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  marginBottom: '0.35rem',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Domicilio Postal <span style={{ color: 'var(--color-warning)' }}>*</span>
              </label>
              <input
                type="text"
                required
                placeholder="ej: Av. Constitución 1234, Luján"
                value={domicilioPostal}
                onChange={(e) => setDomicilioPostal(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: !domicilioPostal
                    ? '1px solid var(--color-warning-border)'
                    : '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-input-bg)',
                  color: 'var(--color-text)',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  marginBottom: '0.35rem',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Teléfono de Contacto <span style={{ color: 'var(--color-warning)' }}>*</span>
              </label>
              <input
                type="text"
                required
                placeholder="ej: +54 11 4455-6677"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: !telefono
                    ? '1px solid var(--color-warning-border)'
                    : '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-input-bg)',
                  color: 'var(--color-text)',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={savingProfile}>
              {savingProfile ? 'Guardando...' : 'Guardar Datos Personales'}
            </button>
          </div>
        </form>
      </div>

      {/* Sección 2: Cambio de Contraseña */}
      <div className="card">
        <h3
          style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          🔒 Cambiar Contraseña
        </h3>

        {passwordSuccessMsg && (
          <div
            style={{
              background: 'var(--color-success-bg)',
              border: '1px solid var(--color-success-border)',
              color: 'var(--color-success)',
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.25rem',
              fontSize: '0.88rem',
            }}
          >
            {passwordSuccessMsg}
          </div>
        )}

        {passwordErrorMsg && (
          <div
            style={{
              background: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger-border)',
              color: 'var(--color-danger)',
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.25rem',
              fontSize: '0.88rem',
            }}
          >
            {passwordErrorMsg}
          </div>
        )}

        <form
          onSubmit={handleChangePassword}
          noValidate
          style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                marginBottom: '0.35rem',
                color: 'var(--color-text-secondary)',
              }}
            >
              Contraseña Actual <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={passwordActual}
              onChange={(e) => {
                setPasswordActual(e.target.value);
                if (passwordFieldErrors.passwordActual) {
                  setPasswordFieldErrors((prev) => ({ ...prev, passwordActual: undefined as any }));
                }
              }}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: passwordFieldErrors.passwordActual
                  ? '1px solid var(--color-danger)'
                  : '1px solid var(--color-border)',
                backgroundColor: 'var(--color-input-bg)',
                color: 'var(--color-text)',
                outline: 'none',
              }}
            />
            {passwordFieldErrors.passwordActual && (
              <span
                style={{
                  color: 'var(--color-danger)',
                  fontSize: '0.78rem',
                  marginTop: '0.2rem',
                  display: 'block',
                }}
              >
                ⚠️ {passwordFieldErrors.passwordActual}
              </span>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.1rem',
              alignItems: 'start',
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  marginBottom: '0.35rem',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Nueva Contraseña <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                type="password"
                required
                placeholder="Mínimo 8 caracteres"
                value={passwordNueva}
                onChange={(e) => {
                  setPasswordNueva(e.target.value);
                  if (passwordFieldErrors.passwordNueva) {
                    setPasswordFieldErrors((prev) => ({
                      ...prev,
                      passwordNueva: undefined as any,
                    }));
                  }
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: passwordFieldErrors.passwordNueva
                    ? '1px solid var(--color-danger)'
                    : '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-input-bg)',
                  color: 'var(--color-text)',
                  outline: 'none',
                }}
              />
              <PasswordRequirements password={passwordNueva} />
              {passwordFieldErrors.passwordNueva && (
                <span
                  style={{
                    color: 'var(--color-danger)',
                    fontSize: '0.78rem',
                    marginTop: '0.2rem',
                    display: 'block',
                  }}
                >
                  ⚠️ {passwordFieldErrors.passwordNueva}
                </span>
              )}
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  marginBottom: '0.35rem',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Confirmar Nueva Contraseña <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (passwordFieldErrors.confirmPassword) {
                    setPasswordFieldErrors((prev) => ({
                      ...prev,
                      confirmPassword: undefined as any,
                    }));
                  }
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: passwordFieldErrors.confirmPassword
                    ? '1px solid var(--color-danger)'
                    : '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-input-bg)',
                  color: 'var(--color-text)',
                  outline: 'none',
                }}
              />
              {passwordFieldErrors.confirmPassword && (
                <span
                  style={{
                    color: 'var(--color-danger)',
                    fontSize: '0.78rem',
                    marginTop: '0.2rem',
                    display: 'block',
                  }}
                >
                  ⚠️ {passwordFieldErrors.confirmPassword}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="submit" className="btn btn-secondary" disabled={changingPassword}>
              {changingPassword ? 'Actualizando...' : 'Actualizar Contraseña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
