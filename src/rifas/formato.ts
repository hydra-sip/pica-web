import { EstadoRifa } from '../api/rifaApi';
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
