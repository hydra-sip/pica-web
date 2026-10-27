/**
 * Textos de las pantallas de inscripción que pisan los de `mensajeDeError`: los globales sirven a
 * otras pantallas (el login, el backoffice de roles) y acá el contexto es otro.
 */
export const MENSAJES_INSCRIPCION: Record<string, string> = {
  USUARIO_NO_ACTIVO:
    'El usuario no está activo (cuenta bloqueada o sin verificar), así que no se puede continuar.',
};

/**
 * Los del paso 1, además de los de toda la inscripción. El 403 USUARIO_BLOQUEADO puede ser por la
 * cuenta del capitán o por un jugador de la nómina, así que no sirve el texto del login.
 */
export const MENSAJES_PASO_1: Record<string, string> = {
  ...MENSAJES_INSCRIPCION,
  USUARIO_BLOQUEADO:
    'Tu cuenta, o la de un jugador de la nómina, tiene un bloqueo vigente. Si creés que es un error, escribile a un administrador.',
};

/** Los de "Mi inscripción", además de los de toda la inscripción. */
export const MENSAJES_MI_INSCRIPCION: Record<string, string> = {
  ...MENSAJES_INSCRIPCION,
  INSCRIPCION_NO_ENCONTRADA: 'No encontramos esta inscripción.',
};

/** Los del reemplazo en "Mi inscripción": el bloqueo puede ser del que entra, como en el paso 1. */
export const MENSAJES_REEMPLAZO: Record<string, string> = {
  ...MENSAJES_PASO_1,
  REEMPLAZO_INVALIDO:
    'Ese cambio no se puede hacer: el que sale tiene que estar en la nómina y el que entra no.',
  JUGADOR_YA_INSCRIPTO: 'Ese jugador ya está en otra inscripción de este torneo.',
  INSCRIPCION_NO_ABIERTA: 'La inscripción del torneo ya cerró: la nómina quedó fija.',
  INSCRIPCION_NO_PERMITIDA_EN_TORNEO:
    'El organizador y los árbitros del torneo no pueden jugar en él.',
  INSCRIPCION_NO_EDITABLE: 'Esta inscripción ya no está confirmada.',
};
