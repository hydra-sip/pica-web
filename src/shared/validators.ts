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

// --- Rifas (PICA-227) ---------------------------------------------------------
// Las mismas reglas que valida el back en RifaService (PICA-226); el back sigue siendo el que decide.

export interface DatosRifaForm {
  titulo: string;
  numeroDesde: string;
  numeroHasta: string;
  precioNumero: string;
  ventaDesde: string;
  ventaHasta: string;
}

/** Errores por campo de la pestaña "Datos generales". `premiosCargados` evita achicar el rango por debajo. */
export const validateDatosRifa = (
  datos: DatosRifaForm,
  premiosCargados: number = 0
): Partial<Record<keyof DatosRifaForm, string>> => {
  const errores: Partial<Record<keyof DatosRifaForm, string>> = {};
  const titulo = datos.titulo.trim();
  if (!titulo) {
    errores.titulo = 'El título es obligatorio.';
  } else if (titulo.length > 100) {
    errores.titulo = 'El título no puede superar los 100 caracteres.';
  }

  const desde = Number(datos.numeroDesde);
  const hasta = Number(datos.numeroHasta);
  if (datos.numeroDesde === '' || !Number.isInteger(desde) || desde < 0) {
    errores.numeroDesde = 'Ingresá un número entero mayor o igual a 0.';
  }
  if (datos.numeroHasta === '' || !Number.isInteger(hasta) || hasta < 0) {
    errores.numeroHasta = 'Ingresá un número entero mayor o igual a 0.';
  } else if (!errores.numeroDesde && hasta < desde) {
    errores.numeroHasta = 'Tiene que ser mayor o igual que el número inicial.';
  } else if (!errores.numeroDesde && hasta - desde + 1 < premiosCargados) {
    errores.numeroHasta = `La rifa tiene ${premiosCargados} premios: no puede tener menos números.`;
  }

  const precio = Number(datos.precioNumero);
  if (datos.precioNumero === '' || !(precio > 0)) {
    errores.precioNumero = 'El precio tiene que ser mayor a 0.';
  } else if (!/^\d+(\.\d{1,2})?$/.test(datos.precioNumero)) {
    errores.precioNumero = 'Hasta 2 decimales.';
  }

  if (!datos.ventaDesde !== !datos.ventaHasta) {
    const falta = datos.ventaDesde ? 'ventaHasta' : 'ventaDesde';
    errores[falta] = 'Las dos fechas van juntas: completá ambas o ninguna.';
  } else if (datos.ventaDesde && datos.ventaHasta) {
    const inicio = new Date(datos.ventaDesde).getTime();
    const fin = new Date(datos.ventaHasta).getTime();
    if (fin <= inicio) {
      errores.ventaHasta = 'Tiene que ser posterior al inicio de la venta.';
    } else if (fin <= Date.now()) {
      errores.ventaHasta = 'La venta no puede terminar en el pasado.';
    }
  }
  return errores;
};

export interface PremioForm {
  pct: string;
  descripcion: string;
}

export interface ErroresPremios {
  general?: string;
  porFila: Record<number, string>;
}

/**
 * Cada % es un entero de 1 a 100 (la pantalla no usa decimales, aunque el back acepta hasta 2);
 * la suma no pasa de 100 ni hay más premios que números.
 */
export const validatePremios = (premios: PremioForm[], cantidadNumeros: number): ErroresPremios => {
  const porFila: Record<number, string> = {};
  premios.forEach((premio, i) => {
    const pct = Number(premio.pct);
    if (!/^\d+$/.test(premio.pct) || pct < 1 || pct > 100) {
      porFila[i] = 'El porcentaje tiene que ser un número entero de 1 a 100.';
    } else if (premio.descripcion.trim().length > 255) {
      porFila[i] = 'La descripción no puede superar los 255 caracteres.';
    }
  });

  let general: string | undefined;
  const suma = sumaPorcentajes(premios);
  if (suma > 100) {
    general = `Los premios suman ${suma} %: no pueden pasar de 100.`;
  } else if (premios.length > cantidadNumeros) {
    general = `Hay ${premios.length} premios y la rifa tiene solo ${cantidadNumeros} números.`;
  }
  return { general, porFila };
};

export const sumaPorcentajes = (premios: PremioForm[]): number =>
  premios.reduce((total, p) => total + (Number(p.pct) || 0), 0);
