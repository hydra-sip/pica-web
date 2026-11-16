import { UsuarioPublico } from '../api/jugadorApi';
import { Gravedad } from '../api/sancionApi';
import { BadgeTone } from '../shared/ui';

export const GRAVEDADES: Gravedad[] = ['LEVE', 'MEDIA', 'GRAVE'];

export const GRAVEDAD: Record<Gravedad, { texto: string; tono: BadgeTone }> = {
  LEVE: { texto: 'Leve', tono: 'info' },
  MEDIA: { texto: 'Media', tono: 'aviso' },
  GRAVE: { texto: 'Grave', tono: 'peligro' },
};

export const nombreCompleto = (u: UsuarioPublico): string => `${u.nombres} ${u.apellidos}`;
