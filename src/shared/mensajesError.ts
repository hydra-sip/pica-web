import { ProblemDetail } from '../auth/types';
import { fechaHora } from './formato';

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
  DEMASIADOS_INTENTOS: 'Demasiados intentos fallidos. Esperá unos minutos y probá de nuevo.',
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
  USUARIO_YA_BLOQUEADO:
    'El usuario ya está bloqueado. Para cambiar el motivo o la duración, levantá el bloqueo y volvé a bloquearlo.',
  USUARIO_PROTEGIDO: 'El usuario Admin del sistema no se puede modificar.',
  ROL_PROTEGIDO: 'Ese cambio no está permitido en este rol del sistema.',
  ULTIMO_ASIGNADOR: 'No podés quitarte tu último rol que permite asignar roles.',
  ACCION_SOBRE_SI_MISMO:
    'No podés darte de baja, bloquearte ni resetear tu contraseña desde acá. Tu contraseña se cambia en Mi perfil.',
  RIFA_NO_ENCONTRADA: 'La rifa no existe o no es tuya.',
  RIFA_NO_EDITABLE: 'La rifa ya no está en borrador: no se puede modificar.',
  RIFA_INCOMPLETA: 'A la rifa le falta completar datos para publicarse.',
  TORNEO_CON_RIFA: 'Ese torneo ya tiene una rifa.',
  TORNEO_NO_ADMITE_RIFA: 'Ese torneo ya empezó o terminó: no se le puede asociar una rifa.',
  NUMERO_NO_DISPONIBLE: 'Alguno de los números ya no está disponible: elegí otros.',
  VENTA_CERRADA: 'La venta de esta rifa no está abierta.',
  RESERVA_VENCIDA: 'Se terminó el tiempo de la reserva: volvé a elegir tus números.',
  RIFA_PROPIA: 'No podés comprar números de tu propia rifa.',
  CLAVE_IDEMPOTENCIA_USADA: 'No se pudo completar la compra: volvé a intentarlo.',
  RIFA_CON_VENTAS: 'La rifa ya tiene números vendidos: no se puede modificar ni eliminar.',
  RIFA_CON_RESERVAS: 'Alguien está pagando números de esta rifa: probá de nuevo en unos minutos.',
  TORNEO_NO_EDITABLE: 'El torneo ya no se puede modificar desde acá.',
  CAMPOS_BLOQUEADOS:
    'Algunos datos ya no se pueden cambiar porque hay inscripciones pagas: recargá la página.',
  TORNEO_INCOMPLETO: 'Al torneo le falta completar datos para publicarse.',
  GASTO_NO_ENCONTRADO: 'Ese gasto ya no existe: recargá la página.',
  REGLAMENTO_NO_ENCONTRADO: 'El torneo no tiene el reglamento en PDF.',
  ARBITRO_NO_ENCONTRADO: 'Ese árbitro ya no está en el torneo: recargá la página.',
  USUARIO_NO_ES_ARBITRO: 'Ese usuario no es un árbitro activo.',
  ARBITRO_DUPLICADO: 'Ese árbitro ya está designado en el torneo.',
  ARBITRO_NO_PERMITIDO: 'No puede arbitrar este torneo: es el organizador o está inscripto.',
  ARBITRO_CON_PARTIDOS: 'Tiene partidos asignados: reasignalos antes de quitarlo.',
  INSCRIPCION_NO_CERRADA: 'El bracket se genera cuando se cierra la inscripción.',
  PARTICIPANTES_INSUFICIENTES:
    'Hacen falta al menos 2 inscripciones confirmadas para armar el bracket.',
  BRACKET_YA_GENERADO: 'El torneo ya tiene bracket: recargá la página.',
  SIN_ARBITROS: 'Designá al menos un árbitro en el paso 2: cada partido necesita uno.',
  BRACKET_CON_RESULTADOS: 'Ya hay resultados cargados: el bracket no se puede volver a sortear.',
  PARTIDO_NO_ENCONTRADO: 'El partido no existe.',
  EVIDENCIA_NO_ENCONTRADA: 'Ese archivo ya no está: recargá la página.',
  PARTIDO_NO_EN_JUEGO: 'Este partido no está en juego: ya tiene resultado o falta el rival.',
  PARTIDO_CERRADO: 'El partido ya está cerrado: no se le puede sumar evidencia.',
  NO_ES_CAPITAN: 'Solo el capitán de uno de los dos lados puede hacerlo.',
  RESULTADO_NO_PENDIENTE: 'No hay un resultado para aceptar u objetar: recargá la página.',
  RESULTADO_PROPIO: 'El resultado que cargaste lo acepta u objeta el rival.',
  PLAZO_OBJECION_VENCIDO: 'Venció el plazo para objetar: el resultado ya se confirma.',
  PARTIDO_NO_OBJETADO: 'El partido ya no está objetado: recargá la página.',
  CHECKIN_SIN_VENTANA: 'Este partido no tiene check-in: no tiene fecha o el torneo no lo usa.',
  CHECKIN_FUERA_DE_VENTANA: 'El check-in no está abierto.',
  PARTIDO_NO_PROGRAMABLE:
    'El partido ya no se puede programar: ya hicieron check-in o se está jugando.',
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
    'Hay un jugador (o vos como capitán) que ya figura en otra inscripción de este torneo. Elegí a otro jugador.',
  NOMINA_INVALIDA:
    'La nómina no cumple lo que pide el torneo: revisá la cantidad de jugadores y que estés vos como capitán.',
  COBRO_RECHAZADO:
    'No se aprobó el pago y no se cobró nada. Tu inscripción sigue pendiente: probá de nuevo.',
  INSCRIPCION_NO_PERMITIDA_EN_TORNEO:
    'El organizador y los árbitros de un torneo no pueden inscribirse en él.',
  PRONOSTICO_FUERA_DE_VENTANA:
    'La ventana para cargar o modificar el pronóstico ya cerró o el partido ya finalizó.',
  PRONOSTICO_INVALIDO: 'El pronóstico indicado no es válido.',
  // HU-506 / T506-2: Reclamos de resultado de rifa
  RECLAMO_FUERA_DE_VENTANA:
    'La ventana de 48 horas para reclamar el resultado de la rifa ya cerró.',
  PLAZO_RECLAMO_VENCIDO:
    'La ventana de 48 horas para reclamar el resultado de la rifa ya cerró.',
  NO_ES_COMPRADOR: 'No podés reclamar: no tenés un ticket comprado para esta rifa.',
  USUARIO_NO_COMPRO_TICKET:
    'No podés reclamar: no tenés un ticket comprado para esta rifa.',
  RECLAMO_DUPLICADO: 'Ya tenés un reclamo registrado para esta rifa.',
  RIFA_NO_SORTEADA: 'La rifa todavía no fue sorteada.',
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
  FECHAS_INVALIDAS: 'Las fechas no son válidas.',
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
  // RNF-SEG-06: el login responde 429 con cuánto falta para poder volver a intentar
  if (
    problema?.codigo === 'DEMASIADOS_INTENTOS' &&
    problema.reintentarEnSegundos &&
    !propios[problema.codigo]
  ) {
    const minutos = Math.ceil(problema.reintentarEnSegundos / 60);
    return `Demasiados intentos fallidos. Probá de nuevo en ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}.`;
  }
  // HU-308: el 409 trae cuándo abre y cuándo cierra la ventana
  if (
    problema?.codigo === 'CHECKIN_FUERA_DE_VENTANA' &&
    problema.abreEn &&
    problema.cierraEn &&
    !propios[problema.codigo]
  ) {
    return Date.now() < new Date(problema.abreEn).getTime()
      ? `Todavía no abrió el check-in: abre el ${fechaHora(problema.abreEn)}.`
      : `El check-in cerró el ${fechaHora(problema.cierraEn)}.`;
  }
  // HU-306: la ventana de pronóstico cerró
  if (
    problema?.codigo === 'PRONOSTICO_FUERA_DE_VENTANA' &&
    problema.cierraEn &&
    !propios[problema.codigo]
  ) {
    return `La ventana para pronosticar cerró el ${fechaHora(problema.cierraEn)}.`;
  }
  if (problema?.codigo && (propios[problema.codigo] || POR_CODIGO[problema.codigo])) {
    return propios[problema.codigo] || POR_CODIGO[problema.codigo];
  }
  // fetch rechaza con TypeError ("Failed to fetch") cuando el back no responde.
  if (err instanceof TypeError) return SIN_CONEXION;
  return problema?.detail || (err instanceof Error && err.message) || porDefecto;
};

/** Errores de un 400 VALIDACION por campo del JSON; `propios` pisa el texto de un código en una pantalla. */
export const erroresPorCampo = (
  err: unknown,
  propios: Record<string, string> = {}
): Record<string, string> => {
  const errores: Record<string, string> = {};
  (problemaDe(err)?.errores || []).forEach((e) => {
    if (e.campo && !errores[e.campo]) {
      errores[e.campo] = propios[e.codigo] || POR_CODIGO_DE_CAMPO[e.codigo] || e.mensaje;
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
