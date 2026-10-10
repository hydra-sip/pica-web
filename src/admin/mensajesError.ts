import { ProblemDetail } from '../auth/types';

// La UI decide el mensaje por `codigo` (openapi.yaml, CodigoError); `detail` queda de respaldo.
const POR_CODIGO: Record<string, string> = {
  VALIDACION: 'Revisá los campos marcados.',
  SIN_PERMISO: 'No tenés permiso para hacer esto.',
  USUARIO_NO_ENCONTRADO: 'El usuario no existe o está dado de baja.',
  PERSONA_NO_ENCONTRADA: 'La persona no existe o está dada de baja.',
  ROL_NO_ENCONTRADO: 'El rol no existe o está dado de baja.',
  PERMISO_NO_ENCONTRADO: 'Hay permisos que no existen.',
  EMAIL_NO_VERIFICADO:
    'Tiene el email sin verificar: no se lo puede pasar a Activo hasta que lo verifique.',
  USERNAME_DUPLICADO: 'Ese nombre de usuario ya está en uso.',
  EMAIL_DUPLICADO: 'Ese email ya está en uso.',
  DOCUMENTO_DUPLICADO: 'Ya hay una persona con ese documento.',
  ROL_DUPLICADO: 'Ya existe un rol con ese nombre.',
  PERSONA_INACTIVA: 'La persona está inactiva.',
  PERSONA_CON_USUARIO: 'La persona ya tiene un usuario.',
  ROL_INACTIVO: 'El rol está inactivo.',
  USUARIO_NO_ACTIVO: 'Solo se le pueden cambiar los roles a un usuario activo.',
  USUARIO_PROTEGIDO: 'El usuario Admin del sistema no se puede modificar.',
  ROL_PROTEGIDO: 'Ese cambio no está permitido en este rol del sistema.',
  ULTIMO_ASIGNADOR: 'No podés quitarte tu último rol que permite asignar roles.',
};

const POR_CODIGO_DE_CAMPO: Record<string, string> = {
  REQUERIDO: 'Es obligatorio.',
  FORMATO_INVALIDO: 'El formato no es válido.',
  LONGITUD: 'El largo no es válido.',
  FECHA_FUTURA: 'No puede ser una fecha futura.',
  PASSWORD_DEBIL: 'Mínimo 8 caracteres, una mayúscula y un número.',
  VALOR_INVALIDO: 'El valor no es válido.',
};

const problemaDe = (err: unknown): ProblemDetail | undefined =>
  (err as { problemDetail?: ProblemDetail } | null)?.problemDetail;

export const codigoDeError = (err: unknown): string | undefined => problemaDe(err)?.codigo;

/** Mensaje para mostrar; `propios` pisa el texto de un código en una pantalla puntual. */
export const mensajeDeError = (
  err: unknown,
  porDefecto: string,
  propios: Record<string, string> = {}
): string => {
  const problema = problemaDe(err);
  if (problema?.codigo && (propios[problema.codigo] || POR_CODIGO[problema.codigo])) {
    return propios[problema.codigo] || POR_CODIGO[problema.codigo];
  }
  return problema?.detail || (err instanceof Error && err.message) || porDefecto;
};

/** Errores de un 400 VALIDACION por campo del JSON. */
export const erroresPorCampo = (err: unknown): Record<string, string> => {
  const errores: Record<string, string> = {};
  (problemaDe(err)?.errores || []).forEach((e) => {
    if (e.campo && !errores[e.campo]) {
      errores[e.campo] = POR_CODIGO_DE_CAMPO[e.codigo] || e.mensaje;
    }
  });
  return errores;
};
