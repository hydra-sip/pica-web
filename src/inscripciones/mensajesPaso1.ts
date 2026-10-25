/**
 * Textos del paso 1 que pisan los de `mensajeDeError`. El 403 USUARIO_BLOQUEADO puede ser por la
 * cuenta del capitán o por un jugador de la nómina, así que no sirve el texto del login.
 */
export const MENSAJES_PASO_1: Record<string, string> = {
  USUARIO_BLOQUEADO:
    'Tu cuenta, o la de un jugador de la nómina, tiene un bloqueo vigente. Si creés que es un error, escribile a un administrador.',
};
