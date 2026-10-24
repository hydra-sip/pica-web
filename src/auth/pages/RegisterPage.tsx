import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/authApi';
import { FieldErrors } from '../types';
import { erroresDelFormulario, mensajeDeError } from '../../shared/mensajesError';
import { PasswordRequirements } from '../components/PasswordRequirements';
import { AuthTarjeta } from '../components/AuthTarjeta';
import { Button, Field, Input, InputClave, Select } from '../../shared/ui';
import {
  TIPOS_DOC_VALIDOS,
  validateNombreApellido,
  validateDocumento,
  validateFechaNacimiento,
  validatePasswordRequirements,
  getTodayDateString,
  MIN_FECHA_NACIMIENTO,
} from '../../shared/validators';

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
      errors.email = 'Ingresá un correo electrónico válido (ej: usuario@unlu.edu.ar)';
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
    } catch (err) {
      const newFieldErrors: FieldErrors = erroresDelFormulario(err, {
        USERNAME_DUPLICADO: 'username',
        EMAIL_DUPLICADO: 'email',
        DOCUMENTO_DUPLICADO: 'nroDoc',
      });
      if (Object.keys(newFieldErrors).length > 0) {
        setFieldErrors(newFieldErrors);
      } else {
        setGeneralError(mensajeDeError(err, 'No se pudo completar el registro.'));
      }
    } finally {
      setLoading(false);
    }
  };

  // Cambia el valor y borra el error del campo apenas se lo corrige
  const cambiar =
    (campo: keyof FieldErrors, set: (valor: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      set(e.target.value);
      if (fieldErrors[campo]) {
        setFieldErrors((prev) => ({ ...prev, [campo]: undefined }));
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
          <Field label="Nombre/s" error={fieldErrors.nombres}>
            <Input
              type="text"
              required
              autoComplete="given-name"
              placeholder="Juan"
              value={nombres}
              onChange={cambiar('nombres', setNombres)}
            />
          </Field>
          <Field label="Apellido/s" error={fieldErrors.apellidos}>
            <Input
              type="text"
              required
              autoComplete="family-name"
              placeholder="Pérez"
              value={apellidos}
              onChange={cambiar('apellidos', setApellidos)}
            />
          </Field>
        </div>

        <Field label="Nombre de usuario" error={fieldErrors.username}>
          <Input
            type="text"
            required
            autoComplete="username"
            placeholder="juanperez"
            value={username}
            onChange={cambiar('username', setUsername)}
          />
        </Field>

        <Field label="Correo electrónico" error={fieldErrors.email}>
          <Input
            type="email"
            required
            autoComplete="email"
            placeholder="juan@correo.com"
            value={email}
            onChange={cambiar('email', setEmail)}
          />
        </Field>

        <div className="auth-fila auth-fila-doc">
          <Field label="Tipo de documento">
            <Select
              value={tipoDoc}
              onChange={(e) => {
                const nuevoTipo = e.target.value;
                setTipoDoc(nuevoTipo);
                if (nroDoc.trim()) {
                  const err = validateDocumento(nroDoc, nuevoTipo, true);
                  setFieldErrors((prev) => ({ ...prev, nroDoc: err || undefined }));
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
          <Field label="Número de documento" error={fieldErrors.nroDoc}>
            <Input
              type="text"
              required
              inputMode={tipoDoc === 'DNI' || tipoDoc === 'LC' || tipoDoc === 'LE' ? 'numeric' : 'text'}
              placeholder={tipoDoc === 'DNI' || tipoDoc === 'LC' || tipoDoc === 'LE' ? '38123456' : 'A1234567'}
              value={nroDoc}
              onChange={cambiar('nroDoc', setNroDoc)}
            />
          </Field>
        </div>

        <Field label="Fecha de nacimiento" error={fieldErrors.fechaNacimiento}>
          <Input
            type="date"
            required
            autoComplete="bday"
            min={MIN_FECHA_NACIMIENTO}
            max={getTodayDateString()}
            value={fechaNacimiento}
            onChange={cambiar('fechaNacimiento', setFechaNacimiento)}
          />
        </Field>

        <Field label="Contraseña" error={fieldErrors.password}>
          <InputClave
            required
            autoComplete="new-password"
            value={password}
            onChange={cambiar('password', setPassword)}
          />
        </Field>
        <PasswordRequirements password={password} style={{ marginTop: '-0.5rem' }} />

        <Field label="Confirmar contraseña" error={fieldErrors.confirmPassword}>
          <InputClave
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={cambiar('confirmPassword', setConfirmPassword)}
          />
        </Field>

        <Button type="submit" block loading={loading}>
          {loading ? 'Creando la cuenta...' : 'Registrarse'}
        </Button>
      </form>
    </AuthTarjeta>
  );
};
