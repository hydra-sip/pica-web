import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../../api/authApi';

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();

  // Profile data form state according to openapi.yaml
  const [nombres, setNombres] = useState(user?.persona?.nombres || user?.name || '');
  const [apellidos, setApellidos] = useState(user?.persona?.apellidos || '');
  const [email] = useState(user?.email || '');
  const [tipoDoc, setTipoDoc] = useState(user?.persona?.tipoDoc || 'DNI');
  const [nroDoc, setNroDoc] = useState(user?.persona?.nroDoc || user?.documento || '');
  const [fechaNacimiento, setFechaNacimiento] = useState(user?.persona?.fechaNacimiento || '');
  const [telefono, setTelefono] = useState(user?.persona?.telefono || user?.telefono || '');

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  // Password change form state according to openapi.yaml
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(null);
  const [passwordErrorMsg, setPasswordErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setNombres(user.persona?.nombres || user.name || '');
      setApellidos(user.persona?.apellidos || '');
      setTipoDoc(user.persona?.tipoDoc || 'DNI');
      setNroDoc(user.persona?.nroDoc || user.documento || '');
      setFechaNacimiento(user.persona?.fechaNacimiento || '');
      setTelefono(user.persona?.telefono || user.telefono || '');
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);

    try {
      const updatedUser = await authApi.updateProfile({
        nombres,
        apellidos,
        tipoDoc,
        nroDoc,
        fechaNacimiento,
        telefono,
      });
      updateUser(updatedUser);
      setProfileSuccessMsg('¡Datos de perfil guardados correctamente!');
    } catch (err: any) {
      setProfileErrorMsg(err.message || 'Error al actualizar el perfil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccessMsg(null);
    setPasswordErrorMsg(null);

    if (passwordNueva.length < 8) {
      setPasswordErrorMsg('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (passwordNueva !== confirmPassword) {
      setPasswordErrorMsg('La confirmación de la nueva contraseña no coincide.');
      return;
    }

    setChangingPassword(true);

    try {
      const res = await authApi.changePassword({ passwordActual, passwordNueva });
      setPasswordSuccessMsg(res.message || 'Contraseña actualizada exitosamente.');
      setPasswordActual('');
      setPasswordNueva('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordErrorMsg(err.message || 'Error al cambiar la contraseña. Verificá tu contraseña actual.');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div style={{ maxWidth: '720px', margin: '2rem auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <span className="badge">Configuración de Cuenta</span>
        <h1 style={{ marginTop: '0.5rem' }}>Mi Perfil</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Gestioná tu información personal y la seguridad de tu acceso según la especificación del sistema.
        </p>
      </div>

      {user && user.datosCompletos === false && (
        <div
          style={{
            background: 'rgba(234, 179, 8, 0.15)',
            border: '1px solid rgba(234, 179, 8, 0.4)',
            color: '#facc15',
            padding: '1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.9rem',
            lineHeight: 1.5,
          }}
        >
          <strong>⚠️ Completá tu perfil:</strong> Por favor, ingresá tu <strong>Número de Documento</strong> y <strong>Teléfono de contacto</strong> para habilitar todas las funciones operativas de la plataforma.
        </div>
      )}

      {/* Sección 1: Datos Personales */}
      <div className="glass-card">
        <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          👤 Datos Personales
        </h3>

        {profileSuccessMsg && (
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.88rem' }}>
            {profileSuccessMsg}
          </div>
        )}

        {profileErrorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.88rem' }}>
            {profileErrorMsg}
          </div>
        )}

        <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                Nombres
              </label>
              <input
                type="text"
                required
                value={nombres}
                onChange={(e) => setNombres(e.target.value)}
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
                Apellidos
              </label>
              <input
                type="text"
                required
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value)}
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
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'rgba(15, 23, 42, 0.4)',
                  color: 'var(--text-muted)',
                  cursor: 'not-allowed',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                Tipo de Documento
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
                Nro Documento <span style={{ color: '#facc15' }}>*</span>
              </label>
              <input
                type="text"
                required
                placeholder="ej: 38123456"
                value={nroDoc}
                onChange={(e) => setNroDoc(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: !nroDoc ? '1px solid rgba(234, 179, 8, 0.5)' : '1px solid var(--border-color)',
                  backgroundColor: 'rgba(15, 23, 42, 0.7)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                Fecha de Nacimiento
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

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                Teléfono de Contacto <span style={{ color: '#facc15' }}>*</span>
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
                  border: !telefono ? '1px solid rgba(234, 179, 8, 0.5)' : '1px solid var(--border-color)',
                  backgroundColor: 'rgba(15, 23, 42, 0.7)',
                  color: 'var(--text-primary)',
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
      <div className="glass-card">
        <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          🔒 Cambiar Contraseña
        </h3>

        {passwordSuccessMsg && (
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.88rem' }}>
            {passwordSuccessMsg}
          </div>
        )}

        {passwordErrorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.88rem' }}>
            {passwordErrorMsg}
          </div>
        )}

        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
              Contraseña Actual
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={passwordActual}
              onChange={(e) => setPasswordActual(e.target.value)}
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                Nueva Contraseña
              </label>
              <input
                type="password"
                required
                placeholder="Mínimo 8 caracteres"
                value={passwordNueva}
                onChange={(e) => setPasswordNueva(e.target.value)}
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
                Confirmar Nueva Contraseña
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
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'rgba(15, 23, 42, 0.7)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
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
