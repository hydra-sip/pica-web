import { EstadoRifa } from '../api/rifaApi';

export const ESTADO_RIFA_UI: Record<EstadoRifa, string> = {
  BORRADOR: 'Borrador',
  EN_VENTA: 'En venta',
  CERRADA: 'Cerrada',
  SORTEADA: 'Sorteada',
  EN_REVISION: 'En revisión',
  LIQUIDADA: 'Liquidada',
  CANCELADA: 'Cancelada',
};

const pesos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

export const formatearPrecio = (monto: number): string => pesos.format(monto);

export const formatearFecha = (iso: string | null): string =>
  iso
    ? new Date(iso).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

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
