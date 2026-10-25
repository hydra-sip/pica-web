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
      setPasswordSuccessMsg('¡Contraseña actualizada con éxito!');
      setPasswordActual('');
      setPasswordNueva('');
      setConfirmPassword('');
    } catch (err: any) {
      if (err instanceof ApiError && err.problemDetail) {
        const pd = err.problemDetail;
        if (pd.errores && Array.isArray(pd.errores)) {
          const errs: Record<string, string> = {};
          pd.errores.forEach((item) => {
            if (item.campo) errs[item.campo] = item.mensaje;
          });
          setPasswordFieldErrors(errs);
        } else {
          setPasswordErrorMsg(pd.detail || pd.codigo || 'Error al cambiar la contraseña.');
        }
      } else {
        setPasswordErrorMsg(
          err.message || 'Error al cambiar la contraseña. Verificá tu contraseña actual.'
        );
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const userInitials = (nombres || user?.name || 'SB')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '0.75rem 0.9rem',
    borderRadius: 'var(--radius-md)',
    border: hasError ? '1px solid #ef4444' : '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    outline: 'none',
  });

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Figma Frame #35:4 - Mi Perfil Card */}
      <div className="hydra-card" style={{ padding: '1.75rem' }}>
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
              fontSize: '1.2rem',
              cursor: 'pointer',
              color: 'var(--text-primary)',
            }}
          >
            ⚙️
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
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                {nombres && apellidos ? `${nombres} ${apellidos}` : user?.name || 'Salvador Baez'}
              </h2>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem', marginBottom: '0.4rem' }}>
              @{user?.username || 'salva_b'} • Capitán
            </div>
            <span
              style={{
                display: 'inline-block',
                padding: '0.2rem 0.65rem',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--brand-black)',
                color: '#ffffff',
                fontSize: '0.68rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
              }}
            >
              ID VERIFICADA
            </span>
          </div>
        </div>

        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '0 0 1.25rem' }}>
          Capitán de 'Los Galácticos'. Jugador de Fútbol 5 y Pádel.
        </p>

        {/* Disciplinas favoritas */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Disciplinas favoritas
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-color)', fontSize: '0.82rem', fontWeight: 600 }}>
              Fútbol 5
            </span>
            <span style={{ padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-color)', fontSize: '0.82rem', fontWeight: 600 }}>
              Pádel
            </span>
            <span style={{ padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-color)', fontSize: '0.82rem', fontWeight: 600 }}>
              Básquet 3×3
            </span>
          </div>
        </div>

        {/* Historial Competitivo */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.65rem' }}>
            Historial Competitivo
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.65rem' }}>
            <div style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.75rem 0.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>42</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Partidos</div>
            </div>
            <div style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.75rem 0.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>31</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Victorias</div>
            </div>
            <div style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.75rem 0.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>4</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Podios</div>
            </div>
            <div style={{ backgroundColor: 'var(--brand-black)', color: '#ffffff', borderRadius: 'var(--radius-md)', padding: '0.75rem 0.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.35rem', fontWeight: 800 }}>73.8%</div>
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
              <span style={{ fontSize: '1.25rem' }}>🏆</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Campeón Torneo Clausura</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Fútbol 5 • Diciembre 2025</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
              <span style={{ fontSize: '1.25rem' }}>⭐</span>
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
      <div className="hydra-card" style={{ padding: '1.75rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
          Editar Información Personal
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Actualizá tus datos de contacto y documentación para torneos federados.
        </p>

        {profileSuccessMsg && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
            ✓ {profileSuccessMsg}
          </div>
        )}

        {profileErrorMsg && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
            ❌ {profileErrorMsg}
          </div>
        )}

        <form onSubmit={handleUpdateProfile} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Nombres <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={nombres}
                onChange={(e) => setNombres(e.target.value)}
                style={inputStyle(!!profileFieldErrors.nombres)}
              />
              {profileFieldErrors.nombres && (
                <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>
                  ⚠️ {profileFieldErrors.nombres}
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
                style={inputStyle(!!profileFieldErrors.apellidos)}
              />
              {profileFieldErrors.apellidos && (
                <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>
                  ⚠️ {profileFieldErrors.apellidos}
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
              style={{ ...inputStyle(), backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', cursor: 'not-allowed' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Tipo
              </label>
              <select
                value={tipoDoc}
                onChange={(e) => setTipoDoc(e.target.value)}
                style={{ padding: '0.75rem 0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)' }}
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
                style={inputStyle(!!profileFieldErrors.nroDoc)}
              />
              {profileFieldErrors.nroDoc && (
                <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>
                  ⚠️ {profileFieldErrors.nroDoc}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
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
                style={inputStyle(!!profileFieldErrors.fechaNacimiento)}
              />
              {profileFieldErrors.fechaNacimiento && (
                <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>
                  ⚠️ {profileFieldErrors.fechaNacimiento}
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
                style={inputStyle()}
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
      <div className="hydra-card" style={{ padding: '1.75rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
          Seguridad y Contraseña
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Actualizá tu clave de acceso para proteger tu billetera y torneos.
        </p>

        {passwordSuccessMsg && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
            ✓ {passwordSuccessMsg}
          </div>
        )}

        {passwordErrorMsg && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
            ❌ {passwordErrorMsg}
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
              style={inputStyle(!!passwordFieldErrors.passwordActual)}
            />
            {passwordFieldErrors.passwordActual && (
              <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>
                ⚠️ {passwordFieldErrors.passwordActual}
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
                style={inputStyle(!!passwordFieldErrors.passwordNueva)}
              />
              <PasswordRequirements password={passwordNueva} />
              {passwordFieldErrors.passwordNueva && (
                <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>
                  ⚠️ {passwordFieldErrors.passwordNueva}
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
                style={inputStyle(!!passwordFieldErrors.confirmPassword)}
              />
              {passwordFieldErrors.confirmPassword && (
                <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>
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
