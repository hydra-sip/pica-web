import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../../api/authApi';
import { ApiError } from '../../api/httpClient';
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
import {
  IconoConfiguracion,
  IconoTrofeo,
  IconoMedalla,
  IconoCheck,
  IconoAlerta,
} from '../../shared/ui/Iconos';
import '../auth.css';

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
    } catch (err: any) {
      if (err instanceof ApiError && err.problemDetail) {
        const pd = err.problemDetail;
        if (pd.errores && Array.isArray(pd.errores)) {
          const errs: Record<string, string> = {};
          pd.errores.forEach((item) => {
            if (item.campo) errs[item.campo] = item.mensaje;
          });
          setProfileFieldErrors(errs);
        } else {
          setProfileErrorMsg(pd.detail || pd.codigo || 'Error al actualizar el perfil.');
        }
      } else {
        setProfileErrorMsg(err.message || 'Error al actualizar el perfil.');
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPassword(true);
    setPasswordSuccessMsg(null);
    setPasswordErrorMsg(null);
    setPasswordFieldErrors({});

    const errors: Record<string, string> = {};

    if (!passwordActual) {
      errors.passwordActual = 'Ingresá tu contraseña actual';
    }

    const pwdCheck = validatePasswordRequirements(passwordNueva);
    if (!pwdCheck.isValid) {
      errors.passwordNueva = pwdCheck.errorMessage || 'La contraseña no cumple con los requisitos';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirmá la nueva contraseña';
    } else if (passwordNueva !== confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden';
    }

    if (Object.keys(errors).length > 0) {
      setPasswordFieldErrors(errors);
      setChangingPassword(false);
      return;
    }

    try {
      await authApi.changePassword({
        passwordActual,
        passwordNueva,
      });
      setPasswordSuccessMsg('¡Contraseña actualizada exitosamente!');
      setPasswordActual('');
      setPasswordNueva('');
      setConfirmPassword('');
    } catch (err: any) {
      if (err instanceof ApiError && err.problemDetail) {
        const pd = err.problemDetail;
        if (pd.codigo === 'PASSWORD_INCORRECTA') {
          setPasswordFieldErrors({ passwordActual: 'La contraseña actual no es correcta.' });
        } else if (pd.codigo === 'PASSWORD_INVALIDA') {
          setPasswordFieldErrors({ passwordNueva: pd.detail || 'La nueva contraseña no cumple con los requisitos mínimos.' });
        } else if (pd.errores && Array.isArray(pd.errores)) {
          const errs: Record<string, string> = {};
          pd.errores.forEach((item) => {
            if (item.campo) errs[item.campo] = item.mensaje;
          });
          setPasswordFieldErrors(errs);
        } else {
          setPasswordErrorMsg(pd.detail || pd.codigo || 'Error al cambiar la contraseña.');
        }
      } else {
        setPasswordErrorMsg(err.message || 'Error al cambiar la contraseña.');
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const userInitials =
    user?.name
      ?.split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';

  const userRole = user?.roles?.[0]?.nombre || user?.role || 'JUGADOR';

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Mi Perfil Card */}
      <div className="pica-card hydra-card" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
            Mi Perfil
          </h1>
          <button
            type="button"
            aria-label="Configuración"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              padding: '4px',
            }}
          >
            <IconoConfiguracion size={20} />
          </button>
        </div>

        {/* User Identity Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1rem' }}>
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              fontWeight: 800,
              color: 'var(--brand-black)',
            }}
          >
            {userInitials}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {user?.name || 'Usuario'}
              </span>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '0.2rem 0.6rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--color-emerald-light)',
                  color: 'var(--color-emerald-dark)',
                  border: '1px solid var(--color-emerald-border)',
                }}
              >
                {userRole}
              </span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              @{user?.username || 'usuario'} • {user?.email}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              Miembro de PICA desde 2026
            </div>
          </div>
        </div>

        {/* Competitive Performance Dashboard */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            color: '#ffffff',
            marginBottom: '1.5rem',
            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.15)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', fontWeight: 700 }}>
              Rendimiento en Competencia
            </span>
            <span style={{ fontSize: '0.72rem', backgroundColor: 'rgba(255,255,255,0.1)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
              Rango Platino
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
            <div style={{ padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '1.35rem', fontWeight: 900 }}>12</div>
              <div style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 500 }}>Torneos</div>
            </div>
            <div style={{ padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--color-emerald)' }}>8</div>
              <div style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 500 }}>Victorias</div>
            </div>
            <div style={{ padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '1.35rem', fontWeight: 900 }}>4</div>
              <div style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 500 }}>Derrotas</div>
            </div>
            <div style={{ padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--color-gold)' }}>67%</div>
              <div style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 500 }}>Win Rate</div>
            </div>
          </div>
        </div>

        {/* Insignias Obtenidas */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.65rem' }}>
            Insignias Obtenidas
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
              <div style={{ color: 'var(--color-gold-dark)', display: 'flex', alignItems: 'center' }}>
                <IconoTrofeo size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Campeón Torneo Clausura</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Fútbol 5 • Diciembre 2025</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
              <div style={{ color: 'var(--color-emerald-dark)', display: 'flex', alignItems: 'center' }}>
                <IconoMedalla size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Fair Play Destacado</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>0 sanciones en más de 20 partidos</div>
              </div>
            </div>
          </div>
        </div>

        {/* Datos Bancarios & KYC Card */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1.5px solid var(--brand-black)',
            backgroundColor: 'var(--bg-surface)',
            cursor: 'pointer',
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              Datos Bancarios & KYC
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              CBU configurado para cobro de premios
            </div>
          </div>
          <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>→</span>
        </div>
      </div>

      {/* Profile Form: Datos Personales */}
      <div className="pica-card hydra-card" style={{ padding: '1.75rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
          Editar Información Personal
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Actualizá tus datos de contacto y documentación para torneos federados.
        </p>

        {profileSuccessMsg && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <IconoCheck size={16} />
            <span>{profileSuccessMsg}</span>
          </div>
        )}

        {profileErrorMsg && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <IconoAlerta size={16} />
            <span>{profileErrorMsg}</span>
          </div>
        )}

        <form onSubmit={handleUpdateProfile} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="auth-fila">
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Nombres <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={nombres}
                onChange={(e) => setNombres(e.target.value)}
                className="input"
                aria-invalid={!!profileFieldErrors.nombres}
              />
              {profileFieldErrors.nombres && (
                <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <IconoAlerta size={13} /> {profileFieldErrors.nombres}
                </span>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Apellidos <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value)}
                className="input"
                aria-invalid={!!profileFieldErrors.apellidos}
              />
              {profileFieldErrors.apellidos && (
                <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <IconoAlerta size={13} /> {profileFieldErrors.apellidos}
                </span>
              )}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Correo Electrónico (No editable)
            </label>
            <input
              type="email"
              disabled
              value={email}
              className="input"
            />
          </div>

          <div className="auth-fila auth-fila-doc">
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Tipo
              </label>
              <select
                value={tipoDoc}
                onChange={(e) => setTipoDoc(e.target.value)}
                className="input"
              >
                {TIPOS_DOC_VALIDOS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Nro Documento
              </label>
              <input
                type="text"
                value={nroDoc}
                onChange={(e) => setNroDoc(e.target.value)}
                className="input"
                aria-invalid={!!profileFieldErrors.nroDoc}
              />
              {profileFieldErrors.nroDoc && (
                <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <IconoAlerta size={13} /> {profileFieldErrors.nroDoc}
                </span>
              )}
            </div>
          </div>

          <div className="auth-fila">
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Fecha de Nacimiento
              </label>
              <input
                type="date"
                min={MIN_FECHA_NACIMIENTO}
                max={getTodayDateString()}
                value={fechaNacimiento}
                onChange={(e) => setFechaNacimiento(e.target.value)}
                className="input"
                aria-invalid={!!profileFieldErrors.fechaNacimiento}
              />
              {profileFieldErrors.fechaNacimiento && (
                <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <IconoAlerta size={13} /> {profileFieldErrors.fechaNacimiento}
                </span>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Teléfono de Contacto
              </label>
              <input
                type="text"
                placeholder="ej: +54 11 4455-6677"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="input"
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

      {/* Profile Form: Seguridad / Contraseña */}
      <div className="pica-card hydra-card" style={{ padding: '1.75rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
          Seguridad y Contraseña
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Actualizá tu clave de acceso para proteger tu billetera y torneos.
        </p>

        {passwordSuccessMsg && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <IconoCheck size={16} />
            <span>{passwordSuccessMsg}</span>
          </div>
        )}

        {passwordErrorMsg && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <IconoAlerta size={16} />
            <span>{passwordErrorMsg}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Contraseña Actual <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={passwordActual}
              onChange={(e) => setPasswordActual(e.target.value)}
              className="input"
              aria-invalid={!!passwordFieldErrors.passwordActual}
            />
            {passwordFieldErrors.passwordActual && (
              <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <IconoAlerta size={13} /> {passwordFieldErrors.passwordActual}
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Nueva Contraseña <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="password"
                required
                placeholder="Mínimo 8 caracteres"
                value={passwordNueva}
                onChange={(e) => setPasswordNueva(e.target.value)}
                className="input"
                aria-invalid={!!passwordFieldErrors.passwordNueva}
              />
              <PasswordRequirements password={passwordNueva} />
              {passwordFieldErrors.passwordNueva && (
                <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <IconoAlerta size={13} /> {passwordFieldErrors.passwordNueva}
                </span>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Confirmar Nueva Contraseña <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                aria-invalid={!!passwordFieldErrors.confirmPassword}
              />
              {passwordFieldErrors.confirmPassword && (
                <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <IconoAlerta size={13} /> {passwordFieldErrors.confirmPassword}
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
