import { EstadoRifa } from '../api/rifaApi';
import { BadgeTone } from '../shared/ui';

// Montos y fechas para mostrar: pesos() y fechaHora() de shared/formato.ts

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

/** ISO de la API → valor de un <input type="datetime-local"> en la hora local del navegador. */
export const isoAInputLocal = (iso: string | null): string => {
  if (!iso) {
    return '';
  }
  const fecha = new Date(iso);
  const local = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

/** Valor de un <input type="datetime-local"> → ISO en UTC para la API (null si está vacío). */
export const inputLocalAIso = (valor: string): string | null =>
  valor ? new Date(valor).toISOString() : null;
