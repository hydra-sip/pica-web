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
