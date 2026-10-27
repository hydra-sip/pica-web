/**
 * Utilidades de formateo para Torneos
 */

export const formatMoneda = (monto: number, moneda: string = 'ARS'): string => {
  if (monto === 0) return 'Gratis';
  try {
    const formatted = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: moneda === 'ARS' ? 'ARS' : moneda,
      maximumFractionDigits: 0,
    }).format(monto);
    return `${formatted} ${moneda}`;
  } catch {
    return `$ ${monto.toLocaleString('es-AR')} ${moneda}`;
  }
};

export const formatFecha = (
  isoString: string | null | undefined,
  incluirHora: boolean = true
): string => {
  if (!isoString) return 'A definir';
  try {
    const fecha = new Date(isoString);
    if (isNaN(fecha.getTime())) return isoString;

    const opciones: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      ...(incluirHora ? { hour: '2-digit', minute: '2-digit' } : {}),
    };

    return new Intl.DateTimeFormat('es-AR', opciones).format(fecha);
  } catch {
    return isoString;
  }
};

export const formatFormatoTorneo = (formato: string): string => {
  switch (formato) {
    case 'ELIMINACION_DIRECTA':
      return 'Eliminación Directa';
    case 'FASE_GRUPOS_ELIMINACION':
      return 'Fase de Grupos y Eliminación';
    case 'TODOS_CONTRA_TODOS':
      return 'Todos contra Todos';
    case 'SUIZO':
      return 'Sistema Suizo';
    default:
      return formato
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
};

export const formatModalidad = (modalidad: string): string => {
  switch (modalidad) {
    case 'PRESENCIAL':
      return 'Presencial';
    case 'ONLINE':
    case 'VIRTUAL':
      return 'Online';
    case 'HIBRIDA':
      return 'Híbrida';
    default:
      return modalidad;
  }
};

export const formatTipoParticipante = (tipo: string, tamanioEquipo?: number | null): string => {
  if (tipo === 'EQUIPO') {
    return tamanioEquipo ? `Equipos (${tamanioEquipo} jugadores)` : 'Equipos';
  }
  return 'Individual';
};

export const calcularPremioPuesto = (
  pozoTotal: number,
  pctPozoCompetidores: number,
  pctPuesto: number
): number => {
  const pozoCompetidores = (pozoTotal * pctPozoCompetidores) / 100;
  return (pozoCompetidores * pctPuesto) / 100;
};
