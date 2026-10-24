import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../../api/authApi';
import { erroresDelFormulario, mensajeDeError } from '../../shared/mensajesError';
import { PasswordRequirements } from '../components/PasswordRequirements';
import { Badge, BadgeTone, Button, Field, Input, Select } from '../../shared/ui';
import './ProfilePage.css';
import {
  TIPOS_DOC_VALIDOS,
  validateNombreApellido,
  validateDocumento,
  validateFechaNacimiento,
  validatePasswordRequirements,
  getTodayDateString,
  MIN_FECHA_NACIMIENTO,
} from '../../shared/validators';

const ESTADOS: Record<string, { texto: string; tono: BadgeTone }> = {
  ACTIVO: { texto: 'Cuenta activa', tono: 'solido' },
  PENDIENTE_VERIFICACION: { texto: 'Email sin verificar', tono: 'aviso' },
  BLOQUEADO: { texto: 'Cuenta bloqueada', tono: 'peligro' },
};

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

  // Un usuario de Google arranca sin contraseña: la crea sin pasar la actual
  const tieneContrasena = user?.tieneContrasena !== false;

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

    if (tieneContrasena && !passwordActual) {
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
      const res = await authApi.changePassword({
        passwordActual: tieneContrasena ? passwordActual : undefined,
        passwordNueva,
      });
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

  // Borra el error del campo apenas se lo corrige
  const limpiarError = (
    set: React.Dispatch<React.SetStateAction<Record<string, string>>>,
    campo: string
  ) => set((prev) => (prev[campo] ? { ...prev, [campo]: '' } : prev));

  const iniciales =
    `${(user?.persona?.nombres || '').charAt(0)}${(user?.persona?.apellidos || '').charAt(0)}`.toUpperCase() ||
    (user?.username || '?').slice(0, 2).toUpperCase();
  const roles = (user?.roles || []).map((r) => r.nombreAmigable || r.nombre).join(', ');
  const estado = ESTADOS[user?.estado || ''];

  return (
    <div className="perfil">
      <header className="perfil-cabecera">
        <span className="perfil-avatar" aria-hidden="true">
          {iniciales}
        </span>
        <div className="perfil-identidad">
          <h1 className="perfil-nombre">{user?.name || user?.username}</h1>
          <p className="perfil-usuario">
            @{user?.username}
            {roles && ` · ${roles}`}
          </p>
          {estado && <Badge tone={estado.tono}>{estado.texto}</Badge>}
        </div>
      </header>

      {user && user.datosCompletos === false && (
        <div className="alerta alerta-aviso">
          <strong>Completá tus datos:</strong> documento, fecha de nacimiento, domicilio y teléfono.
          Sin ellos no vas a poder inscribirte en torneos ni comprar rifas.
        </div>
      )}

      <section className="perfil-seccion" aria-labelledby="perfil-historial">
        <h2 id="perfil-historial" className="perfil-titulo">
          Historial competitivo
        </h2>
        <div className="perfil-stats">
          {['Partidos', 'Ganados', 'Perdidos', '% ganados'].map((dato) => (
            <div key={dato} className="perfil-stat">
              <span className="perfil-stat-valor">—</span>
              <span className="perfil-stat-dato">{dato}</span>
            </div>
          ))}
        </div>
        <p className="perfil-vacio">Todavía no jugaste partidos en PICA.</p>
      </section>

      <section className="perfil-seccion" aria-labelledby="perfil-insignias">
        <h2 id="perfil-insignias" className="perfil-titulo">
          Insignias obtenidas
        </h2>
        <p className="perfil-vacio perfil-vacio-caja">
          Todavía no tenés insignias. Se ganan jugando y ganando torneos.
        </p>
      </section>

      <section className="card perfil-seccion" aria-labelledby="perfil-datos">
        <h2 id="perfil-datos" className="perfil-titulo">
          Datos personales
        </h2>

        {profileSuccessMsg && (
          <div className="alerta alerta-exito" role="status">
            {profileSuccessMsg}
          </div>
        )}
        {profileErrorMsg && (
          <div className="alerta alerta-peligro" role="alert">
            {profileErrorMsg}
          </div>
        )}

        <form onSubmit={handleUpdateProfile} noValidate className="perfil-form">
          <div className="perfil-fila">
            <Field label="Nombres" required error={profileFieldErrors.nombres}>
              <Input
                type="text"
                autoComplete="given-name"
                value={nombres}
                onChange={(e) => {
                  setNombres(e.target.value);
                  limpiarError(setProfileFieldErrors, 'nombres');
                }}
              />
            </Field>
            <Field label="Apellidos" required error={profileFieldErrors.apellidos}>
              <Input
                type="text"
                autoComplete="family-name"
                value={apellidos}
                onChange={(e) => {
                  setApellidos(e.target.value);
                  limpiarError(setProfileFieldErrors, 'apellidos');
                }}
              />
            </Field>
          </div>

          <Field label="Correo electrónico" hint="No se puede cambiar.">
            <Input type="email" readOnly value={email} />
          </Field>

          <div className="perfil-fila">
            <Field label="Tipo de documento">
              <Select
                value={tipoDoc}
                onChange={(e) => {
                  const nuevoTipo = e.target.value;
                  setTipoDoc(nuevoTipo);
                  if (nroDoc && nroDoc.trim()) {
                    const err = validateDocumento(nroDoc, nuevoTipo, true);
                    setProfileFieldErrors((prev) => ({ ...prev, nroDoc: err || '' }));
                  }
                }}
              >
                {TIPOS_DOC_VALIDOS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Número de documento" error={profileFieldErrors.nroDoc}>
              <Input
                type="text"
                inputMode={
                  tipoDoc === 'DNI' || tipoDoc === 'LC' || tipoDoc === 'LE' ? 'numeric' : 'text'
                }
                placeholder={
                  tipoDoc === 'DNI' || tipoDoc === 'LC' || tipoDoc === 'LE'
                    ? 'ej: 38123456'
                    : 'ej: A1234567'
                }
                value={nroDoc}
                onChange={(e) => {
                  setNroDoc(e.target.value);
                  limpiarError(setProfileFieldErrors, 'nroDoc');
                }}
              />
            </Field>
          </div>

          <Field label="Fecha de nacimiento" error={profileFieldErrors.fechaNacimiento}>
            <Input
              type="date"
              autoComplete="bday"
              min={MIN_FECHA_NACIMIENTO}
              max={getTodayDateString()}
              value={fechaNacimiento}
              onChange={(e) => {
                setFechaNacimiento(e.target.value);
                limpiarError(setProfileFieldErrors, 'fechaNacimiento');
              }}
            />
          </Field>

          <div className="perfil-fila">
            <Field label="Domicilio postal" error={profileFieldErrors.domicilioPostal}>
              <Input
                type="text"
                autoComplete="street-address"
                placeholder="ej: Av. Constitución 1234, Luján"
                value={domicilioPostal}
                onChange={(e) => {
                  setDomicilioPostal(e.target.value);
                  limpiarError(setProfileFieldErrors, 'domicilioPostal');
                }}
              />
            </Field>
            <Field label="Teléfono" error={profileFieldErrors.telefono}>
              <Input
                type="tel"
                autoComplete="tel"
                placeholder="ej: +54 11 4455-6677"
                value={telefono}
                onChange={(e) => {
                  setTelefono(e.target.value);
                  limpiarError(setProfileFieldErrors, 'telefono');
                }}
              />
            </Field>
          </div>

          <div className="perfil-acciones">
            <Button type="submit" loading={savingProfile}>
              {savingProfile ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </section>

      <section className="card perfil-seccion" aria-labelledby="perfil-clave">
        <h2 id="perfil-clave" className="perfil-titulo">
          {tieneContrasena ? 'Cambiar contraseña' : 'Crear una contraseña'}
        </h2>
        {!tieneContrasena && (
          <p className="perfil-vacio">
            Entrás con Google. Si creás una contraseña, también vas a poder entrar con tu email.
          </p>
        )}

        {passwordSuccessMsg && (
          <div className="alerta alerta-exito" role="status">
            {passwordSuccessMsg}
          </div>
        )}
        {passwordErrorMsg && (
          <div className="alerta alerta-peligro" role="alert">
            {passwordErrorMsg}
          </div>
        )}

        <form onSubmit={handleChangePassword} noValidate className="perfil-form">
          {tieneContrasena && (
            <Field label="Contraseña actual" error={passwordFieldErrors.passwordActual}>
              <Input
                type="password"
                autoComplete="current-password"
                value={passwordActual}
                onChange={(e) => {
                  setPasswordActual(e.target.value);
                  limpiarError(setPasswordFieldErrors, 'passwordActual');
                }}
              />
            </Field>
          )}
          <div className="perfil-fila">
            <div>
              <Field label="Contraseña nueva" error={passwordFieldErrors.passwordNueva}>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={passwordNueva}
                  onChange={(e) => {
                    setPasswordNueva(e.target.value);
                    limpiarError(setPasswordFieldErrors, 'passwordNueva');
                  }}
                />
              </Field>
              <PasswordRequirements password={passwordNueva} />
            </div>
            <Field label="Confirmar contraseña nueva" error={passwordFieldErrors.confirmPassword}>
              <Input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  limpiarError(setPasswordFieldErrors, 'confirmPassword');
                }}
              />
            </Field>
          </div>

          <div className="perfil-acciones">
            <Button type="submit" variant="secondary" loading={changingPassword}>
              {changingPassword
                ? 'Actualizando...'
                : tieneContrasena
                  ? 'Cambiar contraseña'
                  : 'Crear contraseña'}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
};
