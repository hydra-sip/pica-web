import { EstadoTorneo, TipoParticipante } from '../api/torneoApi';
import { pesos } from '../shared/formato';
import { BadgeTone } from '../shared/ui';

/** `20000` → `$ 20.000,00 ARS`: el símbolo y la nomenclatura de pesos argentinos (HU-601). Sin monto, `-`. */
export const pesosArs = (monto: number | null | undefined): string =>
  monto === null || monto === undefined ? '-' : `${pesos(monto)} ARS`;

// Montos y fechas para mostrar, y los <input type="datetime-local">: shared/formato.ts

export const ESTADO_TORNEO_UI: Record<EstadoTorneo, string> = {
  BORRADOR: 'Borrador',
  INSCRIPCION_ABIERTA: 'Inscripción abierta',
  INSCRIPCION_CERRADA: 'Inscripción cerrada',
  EN_CURSO: 'En curso',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
};

/** Color del Badge de cada estado. */
export const TONO_ESTADO_TORNEO: Record<EstadoTorneo, BadgeTone> = {
  BORRADOR: 'aviso',
  INSCRIPCION_ABIERTA: 'exito',
  INSCRIPCION_CERRADA: 'info',
  EN_CURSO: 'solido',
  FINALIZADO: 'neutral',
  CANCELADO: 'peligro',
};

/** "equipos" o "jugadores", según quién se inscribe; sin definir, "participantes". */
export const participantes = (tipo: TipoParticipante | '' | null): string =>
  tipo === 'EQUIPO' ? 'equipos' : tipo === 'INDIVIDUAL' ? 'jugadores' : 'participantes';
