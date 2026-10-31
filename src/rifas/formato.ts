import { EstadoRifa, TicketDetalle } from '../api/rifaApi';
import { EstadoTorneo } from '../api/torneoApi';
import { BadgeTone } from '../shared/ui';

// Montos y fechas para mostrar, y los <input type="datetime-local">: shared/formato.ts

export const ESTADO_RIFA_UI: Record<EstadoRifa, string> = {
  BORRADOR: 'Borrador',
  EN_VENTA: 'En venta',
  CERRADA: 'Cerrada',
  SORTEADA: 'Sorteada',
  EN_REVISION: 'En revisión',
  LIQUIDADA: 'Liquidada',
  CANCELADA: 'Cancelada',
};

/** Color del Badge de cada estado; los que no tienen uno propio van en neutro. */
export const TONO_ESTADO_RIFA: Record<EstadoRifa, BadgeTone> = {
  BORRADOR: 'aviso',
  EN_VENTA: 'exito',
  CERRADA: 'neutral',
  SORTEADA: 'info',
  EN_REVISION: 'aviso',
  LIQUIDADA: 'neutral',
  CANCELADA: 'peligro',
};

const SORTEADAS: EstadoRifa[] = ['SORTEADA', 'EN_REVISION', 'LIQUIDADA'];

/**
 * HU-504: qué le tocó al ticket en el sorteo, para el comprador; null si la rifa todavía no se sorteó.
 * Ej.: "¡Ganaste el 1º premio con el #12!" o "Esta vez no ganaste."
 */
export const resultadoDelTicket = (
  ticket: TicketDetalle
): { texto: string; gano: boolean } | null => {
  if (!SORTEADAS.includes(ticket.rifaEstado)) return null;
  if (ticket.premiosGanados.length === 0) return { texto: 'Esta vez no ganaste.', gano: false };
  const premios = ticket.premiosGanados
    .map((p) => `el ${p.puesto}º premio con el #${p.numeroGanador}`)
    .join(' y ');
  return { texto: `¡Ganaste ${premios}!`, gano: true };
};

/** La rifa va con un torneo en borrador o publicado que todavía no empezó (lo mismo valida el back). */
export const ESTADOS_TORNEO_CON_RIFA: EstadoTorneo[] = [
  'BORRADOR',
  'INSCRIPCION_ABIERTA',
  'INSCRIPCION_CERRADA',
];
