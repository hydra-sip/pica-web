import { Decision, VersionResultado } from '../api/partidoApi';
import { EstadoPartido, PartidoBracket } from '../api/torneoApi';
import { BadgeTone } from '../shared/ui';

export const ESTADO_PARTIDO_UI: Record<EstadoPartido, string> = {
  PROGRAMADO: 'Por jugar',
  CHECK_IN: 'Check-in',
  EN_JUEGO: 'En juego',
  RESULTADO_CARGADO: 'Pendiente de confirmación',
  CONFIRMADO: 'Confirmado',
  OBJETADO: 'Objetado',
  CORREGIDO: 'Corregido',
  WALKOVER: 'Walkover',
};

export const TONO_ESTADO_PARTIDO: Record<EstadoPartido, BadgeTone> = {
  PROGRAMADO: 'neutral',
  CHECK_IN: 'info',
  EN_JUEGO: 'info',
  RESULTADO_CARGADO: 'aviso',
  CONFIRMADO: 'exito',
  OBJETADO: 'peligro',
  CORREGIDO: 'exito',
  WALKOVER: 'neutral',
};

/** Se le puede cargar resultado y hacer check-in; el check-in (HU-308) no es requisito para cargarlo. */
export const EN_JUEGO: EstadoPartido[] = ['PROGRAMADO', 'CHECK_IN', 'EN_JUEGO'];

/** Ya no cambian: el ganador pasó a la ronda siguiente. */
export const CERRADOS: EstadoPartido[] = ['CONFIRMADO', 'CORREGIDO', 'WALKOVER'];

/**
 * Cómo se cerró un partido por ausencia (HU-309), si se cerró así:
 * - WALKOVER: se presentó un solo lado y ganó;
 * - DESCALIFICADOS: no se presentó ninguno y quedaron fuera los dos;
 * - PASE_DIRECTO: el rival quedó vacante por unos descalificados y el que llegó pasó sin jugar. En la ronda 1 eso
 *   es un BYE del sorteo.
 */
export type CierrePorAusencia = 'WALKOVER' | 'DESCALIFICADOS' | 'PASE_DIRECTO';

export const cierrePorAusencia = (
  partido: Pick<PartidoBracket, 'estado' | 'ronda' | 'local' | 'visitante'>
): CierrePorAusencia | null => {
  const { estado, ronda, local, visitante } = partido;
  if (estado === 'WALKOVER') {
    return local?.ganador || visitante?.ganador ? 'WALKOVER' : 'DESCALIFICADOS';
  }
  if (estado === 'CONFIRMADO' && ronda > 1 && (local === null) !== (visitante === null)) {
    return 'PASE_DIRECTO';
  }
  return null;
};

/** `11 min 45 seg`; vencido, `0 seg`. */
export const tiempoRestante = (milisegundos: number): string => {
  const segundos = Math.max(0, Math.floor(milisegundos / 1000));
  const minutos = Math.floor(segundos / 60);
  return minutos > 0 ? `${minutos} min ${segundos % 60} seg` : `${segundos} seg`;
};

/** Para una cuenta regresiva larga: `2 d 3 h`, `1 h 20 min` o, en la última hora, `11 min 45 seg`. */
export const tiempoHasta = (milisegundos: number): string => {
  const minutos = Math.floor(Math.max(0, milisegundos) / 60_000);
  const horas = Math.floor(minutos / 60);
  if (horas >= 24) return `${Math.floor(horas / 24)} d ${horas % 24} h`;
  if (horas > 0) return `${horas} h ${minutos % 60} min`;
  return tiempoRestante(milisegundos);
};

/** `2 - 0`, o `1 (4) - 1 (2)` con penales. */
export const marcadorDeVersion = (v: VersionResultado): string =>
  v.penalesLocal == null
    ? `${v.puntajeLocal} - ${v.puntajeVisitante}`
    : `${v.puntajeLocal} (${v.penalesLocal}) - ${v.puntajeVisitante} (${v.penalesVisitante})`;

export const ESTADO_OBJECION_UI = (decision: Decision | null): string =>
  decision === 'CORREGIDO' ? 'Corregido' : decision === 'CONFIRMADO' ? 'Confirmado' : 'Pendiente';
