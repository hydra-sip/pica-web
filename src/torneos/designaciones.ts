import { EstadoDesignacion, MiDesignacion, PermisoArbitro } from '../api/torneoApi';
import { BadgeTone } from '../shared/ui';
import { fecha } from '../shared/formato';

/** Textos de la designación de árbitros (HU-807), compartidos por la lista y la pantalla de cada una. */
export const PERMISO_DESIGNACION: Record<PermisoArbitro, string> = {
  CARGAR_RESULTADOS: 'Cargar y validar resultados',
  RESOLVER_OBJECIONES: 'Resolver objeciones',
};

export const ESTADO_DESIGNACION: Record<EstadoDesignacion, { texto: string; tono: BadgeTone }> = {
  PENDIENTE: { texto: 'Pendiente', tono: 'aviso' },
  ACEPTADO: { texto: 'Aceptada', tono: 'exito' },
  RECHAZADO: { texto: 'Rechazada', tono: 'peligro' },
};

/** El código de imparcialidad del wireframe 49: hay que aceptar los tres para arbitrar. */
export const COMPROMISOS = [
  'No tengo intereses deportivos ni económicos con los participantes del torneo.',
  'Voy a estar disponible desde 15 minutos antes de cada partido que me asignen.',
  'Voy a registrar evidencia objetiva si hay una objeción de resultado.',
];

/** "20/11/2026 – 22/11/2026", o solo el inicio si no hay fin estimado. */
export const periodo = (d: MiDesignacion): string => {
  if (!d.fechaInicio) return 'Sin definir';
  return d.fechaFin
    ? `${fecha(d.fechaInicio)} – ${fecha(d.fechaFin)}`
    : `Desde el ${fecha(d.fechaInicio)}`;
};
