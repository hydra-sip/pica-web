import { ProblemDetail } from '../auth/types';

// La UI decide el mensaje por `codigo` (openapi.yaml, CodigoError); `detail` queda de respaldo.
const SESION_VENCIDA = 'Tu sesión venció. Iniciá sesión de nuevo.';

const POR_CODIGO: Record<string, string> = {
  VALIDACION: 'Revisá los campos marcados.',
  NO_AUTENTICADO: 'Tenés que iniciar sesión.',
  TOKEN_INVALIDO: SESION_VENCIDA,
  TOKEN_VENCIDO: SESION_VENCIDA,
  SESION_REVOCADA: SESION_VENCIDA,
  REFRESH_INVALIDO: SESION_VENCIDA,
  REFRESH_REUTILIZADO: SESION_VENCIDA,
  SIN_PERMISO: 'No tenés permiso para hacer esto.',
  ERROR_INTERNO: 'Algo falló en el servidor. Probá de nuevo en un rato.',
  USUARIO_NO_ENCONTRADO: 'El usuario no existe o está dado de baja.',
  PERSONA_NO_ENCONTRADA: 'La persona no existe o está dada de baja.',
  ROL_NO_ENCONTRADO: 'El rol no existe o está dado de baja.',
  PERMISO_NO_ENCONTRADO: 'Hay permisos que no existen.',
  CREDENCIALES_INVALIDAS: 'Usuario, email o contraseña incorrectos.',
  EMAIL_NO_VERIFICADO:
    'Tiene el email sin verificar: no se lo puede pasar a Activo hasta que lo verifique.',
  USUARIO_BLOQUEADO:
    'La cuenta está bloqueada. Si creés que es un error, escribile a un administrador.',
  TOKEN_EXPIRADO: 'El enlace venció. Pedí uno nuevo.',
  TOKEN_USADO: 'Ese enlace ya se usó. Si ya verificaste tu cuenta, iniciá sesión.',
  CODIGO_INVALIDO: 'No se pudo terminar el ingreso con Google. Probá de nuevo.',
  PASSWORD_ACTUAL_INCORRECTA: 'La contraseña actual no es correcta.',
  USERNAME_DUPLICADO: 'Ese nombre de usuario ya está en uso.',
  EMAIL_DUPLICADO: 'Ese email ya está en uso.',
  DOCUMENTO_DUPLICADO: 'Ya hay una persona con ese documento.',
  ROL_DUPLICADO: 'Ya existe un rol con ese nombre.',
  PERSONA_INACTIVA: 'La persona está inactiva.',
  PERSONA_CON_USUARIO: 'La persona ya tiene un usuario.',
  DOCUMENTO_NO_EDITABLE: 'El documento no se puede cambiar una vez cargado.',
  ROL_INACTIVO: 'El rol está inactivo.',
  USUARIO_NO_ACTIVO: 'Solo se le pueden cambiar los roles a un usuario activo.',
  USUARIO_YA_BLOQUEADO: 'El usuario ya está bloqueado. Para cambiar el motivo o la duración, levantá el bloqueo y volvé a bloquearlo.',
  USUARIO_PROTEGIDO: 'El usuario Admin del sistema no se puede modificar.',
  ROL_PROTEGIDO: 'Ese cambio no está permitido en este rol del sistema.',
  ULTIMO_ASIGNADOR: 'No podés quitarte tu último rol que permite asignar roles.',
  ACCION_SOBRE_SI_MISMO:
    'No podés darte de baja, bloquearte ni resetear tu contraseña desde acá. Tu contraseña se cambia en Mi perfil.',
  RIFA_NO_ENCONTRADA: 'La rifa no existe o no es tuya.',
  RIFA_NO_EDITABLE: 'La rifa ya no está en borrador: no se puede modificar.',
  TORNEO_NO_ENCONTRADO: 'El torneo no existe o ya no está disponible.',
  INSCRIPCION_NO_ENCONTRADA: 'La inscripción no existe o no es tuya.',
  EQUIPO_NO_ENCONTRADO: 'El equipo no existe o no es tuyo.',
  INSCRIPCION_NO_ABIERTA: 'La inscripción a este torneo no está abierta o ya cerró.',
  INSCRIPCION_DUPLICADA: 'Ya hay una inscripción tuya, o de ese equipo, en este torneo.',
  INSCRIPCION_NO_EDITABLE:
    'La inscripción cambió de estado y ya no se puede hacer esto. Recargá la pantalla para ver cómo quedó.',
  REGLAMENTO_NO_ACEPTADO: 'Tenés que aceptar el reglamento para continuar.',
  CUPO_COMPLETO: 'Se completó el cupo del torneo y no queda lugar. No se te cobró nada.',
  JUGADOR_YA_INSCRIPTO:
    'Hay un jugador (o vos como capitán) que ya figura en otra inscripción de este torneo. Reemplazalo por otro.',
  NOMINA_INVALIDA:
    'La nómina no cumple lo que pide el torneo: revisá la cantidad de jugadores y que estés vos como capitán.',
  COBRO_RECHAZADO:
    'No se aprobó el pago y no se cobró nada. Tu inscripción sigue pendiente: probá de nuevo.',
  INSCRIPCION_NO_PERMITIDA_EN_TORNEO:
    'El organizador y los árbitros de un torneo no pueden inscribirse en él.',
};

const POR_CODIGO_DE_CAMPO: Record<string, string> = {
  REQUERIDO: 'Es obligatorio.',
  FORMATO_INVALIDO: 'El formato no es válido.',
  LONGITUD: 'El largo no es válido.',
  FECHA_FUTURA: 'No puede ser una fecha futura.',
  PASSWORD_DEBIL: 'Mínimo 8 caracteres, una mayúscula y un número.',
  NOMBRE_INVALIDO: 'Tiene caracteres que no se permiten en un nombre.',
  EDAD_FUERA_DE_RANGO: 'La edad tiene que estar entre 18 y 120 años.',
  RANGO_INVALIDO: 'El rango de números no es válido.',
  VENTANA_INVALIDA: 'Las fechas de venta no son válidas.',
  PREMIOS_INVALIDOS: 'Los premios no son válidos.',
  VALOR_INVALIDO: 'El valor no es válido.',
};

const SIN_CONEXION = 'No pudimos conectar con el servidor. Revisá tu conexión y probá de nuevo.';

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
  // fetch rechaza con TypeError ("Failed to fetch") cuando el back no responde.
  if (err instanceof TypeError) return SIN_CONEXION;
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

/** `erroresPorCampo` más el campo al que apunta un código de negocio, como `{ EMAIL_DUPLICADO: 'email' }`. */
export const erroresDelFormulario = (
  err: unknown,
  campoPorCodigo: Record<string, string>
): Record<string, string> => {
  const errores = erroresPorCampo(err);
  const codigo = codigoDeError(err);
  const campo = codigo && campoPorCodigo[codigo];
  if (campo && !errores[campo]) errores[campo] = mensajeDeError(err, '');
  return errores;
};
