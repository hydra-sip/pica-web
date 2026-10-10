export interface PasswordValidationResult {
  isValid: boolean;
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  errorMessage?: string;
}

export interface TipoDocOption {
  value: string;
  label: string;
}

export const TIPOS_DOC_VALIDOS: TipoDocOption[] = [
  { value: 'DNI', label: 'DNI' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
  { value: 'LC', label: 'Libreta Cívica (LC)' },
  { value: 'LE', label: 'Libreta Enrolamiento (LE)' },
  { value: 'CI', label: 'Cédula de Identidad (CI)' },
];

export const MIN_FECHA_NACIMIENTO = '1900-01-01';

export const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Valida los requisitos de la contraseña según la política de seguridad:
 * - Mínimo 8 caracteres
 * - Al menos una letra mayúscula
 * - Al menos un número
 */
export const validatePasswordRequirements = (password: string): PasswordValidationResult => {
  const val = password || '';
  const hasMinLength = val.length >= 8;
  const hasUppercase = /[A-Z]/.test(val);
  const hasNumber = /[0-9]/.test(val);
  const isValid = hasMinLength && hasUppercase && hasNumber;

  let errorMessage: string | undefined;
  if (!isValid) {
    errorMessage = 'La contraseña debe tener al menos 8 caracteres, una mayúscula y un número.';
  }

  return {
    isValid,
    hasMinLength,
    hasUppercase,
    hasNumber,
    errorMessage,
  };
};

/**
 * Valida nombres y apellidos:
 * - Obligatorio si required = true
 * - Sin números
 * - Máximo 100 caracteres
 */
export const validateNombreApellido = (
  value: string,
  label: string = 'El campo',
  required: boolean = true
): string | null => {
  const val = (value || '').trim();

  if (!val) {
    return required ? `${label} es obligatorio.` : null;
  }

  if (/\d/.test(val)) {
    return `${label} no puede contener números.`;
  }

  if (val.length > 100) {
    return `${label} no puede superar los 100 caracteres.`;
  }

  return null;
};

/**
 * Valida el formato del documento según el tipo seleccionado:
 * - DNI, LC, LE: exactamente 7 u 8 dígitos numéricos, sin puntos ni guiones.
 * - PASAPORTE, CI: alfanumérico entre 5 y 20 caracteres, con al menos un dígito numérico.
 */
export const validateDocumento = (
  nroDoc: string,
  tipoDoc: string = 'DNI',
  required: boolean = true
): string | null => {
  const val = (nroDoc || '').trim();

  if (!val) {
    return required ? 'El número de documento es obligatorio.' : null;
  }

  if (val.includes('.') || val.includes('-') || val.includes(' ')) {
    return 'El número de documento no debe contener puntos, guiones ni espacios.';
  }

  const tipo = (tipoDoc || 'DNI').toUpperCase();

  if (tipo === 'DNI' || tipo === 'LC' || tipo === 'LE') {
    if (!/^\d+$/.test(val)) {
      return `${tipo}: el número solo puede contener dígitos.`;
    }
    if (val.length < 7 || val.length > 8) {
      return `${tipo}: el número debe tener 7 u 8 dígitos.`;
    }
    return null;
  }

  if (tipo === 'PASAPORTE' || tipo === 'CI') {
    if (val.length < 5 || val.length > 20) {
      return `${tipo}: debe tener entre 5 y 20 caracteres.`;
    }
    if (!/^[0-9A-Za-z]+$/.test(val)) {
      return `${tipo}: solo puede contener letras y números.`;
    }
    if (!/\d/.test(val)) {
      return `${tipo}: el número es alfanumérico y lleva al menos un dígito.`;
    }
    return null;
  }

  // Tipo desconocido o no soportado
  return 'Tipo de documento no válido.';
};

/**
 * Valida la fecha de nacimiento:
 * - No puede ser una fecha futura
 * - No puede ser anterior a 1900
 */
export const validateFechaNacimiento = (
  fecha: string,
  required: boolean = false
): string | null => {
  const val = (fecha || '').trim();

  if (!val) {
    return required ? 'La fecha de nacimiento es obligatoria.' : null;
  }

  const todayStr = getTodayDateString();
  if (val > todayStr) {
    return 'La fecha de nacimiento no puede ser una fecha futura.';
  }

  if (val < MIN_FECHA_NACIMIENTO) {
    return 'La fecha de nacimiento debe ser posterior a 1900.';
  }

  return null;
};
