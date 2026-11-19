import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/authApi';
import { ApiError } from '../../api/httpClient';
import { FieldErrors } from '../types';
import { AuthTarjeta } from '../components/AuthTarjeta';
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
import { Button, Field, Input, InputClave, Select } from '../../shared/ui';

/**
 * Alta de cuenta, con el layout del frame «Registro» del wireframe (PICA-451): la misma tarjeta que el login, los
 * campos que pide el back (nombre y apellido por separado, en una fila), la casilla de Bases y Condiciones y la
 * leyenda de la política de privacidad.
 */
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

  /** Al escribir en un campo se borra su error. */
  const cambiar =
    (setter: (valor: string) => void, campo: keyof FieldErrors) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
      if (fieldErrors[campo]) setFieldErrors((prev) => ({ ...prev, [campo]: undefined }));
    };

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
    } catch (err: unknown) {
      if (err instanceof ApiError && err.problemDetail) {
        const pd = err.problemDetail;
        const newFieldErrors: Record<string, string> = {};

        // Parse 400 VALIDACION errores[]
        if (pd.errores && Array.isArray(pd.errores)) {
          pd.errores.forEach((item) => {
            if (item.campo) {
              newFieldErrors[item.campo] = item.mensaje;
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
          setFieldErrors(newFieldErrors as FieldErrors);
        } else {
          setGeneralError(pd.detail || pd.codigo || 'Error al procesar el registro');
        }
      } else {
        setGeneralError(err instanceof Error ? err.message : 'Error al procesar el registro');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthTarjeta>
      {generalError && (
        <div className="alerta alerta-peligro" role="alert">
          {generalError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="auth-form">
        <div className="auth-fila">
          <Field label="Nombre/s" required error={fieldErrors.nombres}>
            <Input
              type="text"
              autoComplete="given-name"
              placeholder="Juan"
              value={nombres}
              onChange={cambiar(setNombres, 'nombres')}
            />
          </Field>
          <Field label="Apellido/s" required error={fieldErrors.apellidos}>
            <Input
              type="text"
              autoComplete="family-name"
              placeholder="Pérez"
              value={apellidos}
              onChange={cambiar(setApellidos, 'apellidos')}
            />
          </Field>
        </div>

        <Field label="Nombre de usuario" required error={fieldErrors.username}>
          <Input
            type="text"
            autoComplete="username"
            placeholder="juanperez"
            value={username}
            onChange={cambiar(setUsername, 'username')}
          />
        </Field>

        <Field label="Correo Electrónico" required error={fieldErrors.email}>
          <Input
            type="email"
            autoComplete="email"
            placeholder="juan@correo.com"
            value={email}
            onChange={cambiar(setEmail, 'email')}
          />
        </Field>

        <div className="auth-fila auth-fila-doc">
          <Field label="Tipo">
            <Select value={tipoDoc} onChange={(e) => setTipoDoc(e.target.value)}>
              {TIPOS_DOC_VALIDOS.map((td) => (
                <option key={td.value} value={td.value}>
                  {td.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Número de documento" required error={fieldErrors.nroDoc}>
            <Input
              type="text"
              placeholder="38123456"
              value={nroDoc}
              onChange={cambiar(setNroDoc, 'nroDoc')}
            />
          </Field>
        </div>

        <Field label="Fecha de nacimiento" required error={fieldErrors.fechaNacimiento}>
          <Input
            type="date"
            autoComplete="bday"
            min={MIN_FECHA_NACIMIENTO}
            max={getTodayDateString()}
            value={fechaNacimiento}
            onChange={cambiar(setFechaNacimiento, 'fechaNacimiento')}
          />
        </Field>

        <Field label="Contraseña" required error={fieldErrors.password}>
          <InputClave
            autoComplete="new-password"
            placeholder="••••••••••••"
            value={password}
            onChange={cambiar(setPassword, 'password')}
          />
        </Field>
        <PasswordRequirements password={password} />

        <Field label="Confirmar contraseña" required error={fieldErrors.confirmPassword}>
          <InputClave
            autoComplete="new-password"
            placeholder="••••••••••••"
            value={confirmPassword}
            onChange={cambiar(setConfirmPassword, 'confirmPassword')}
          />
        </Field>

        <div className="auth-casilla">
          <label>
            <input
              type="checkbox"
              checked={aceptaTerminos}
              onChange={(e) => {
                setAceptaTerminos(e.target.checked);
                if (terminosError) setTerminosError(null);
              }}
              aria-invalid={terminosError ? true : undefined}
              aria-describedby={terminosError ? 'registro-terminos-error' : undefined}
            />
            Acepto las Bases y Condiciones
          </label>
          {terminosError && (
            <span id="registro-terminos-error" className="field-error" role="alert">
              {terminosError}
            </span>
          )}
        </div>

        <Button type="submit" block loading={loading}>
          {loading ? 'Creando cuenta...' : 'Registrarse'}
        </Button>
      </form>

      <p className="auth-legal">
        Al continuar, aceptás las Bases y Condiciones
        <br />
        <strong>y la Política de Privacidad de PICA</strong>
      </p>
    </AuthTarjeta>
  );
};
