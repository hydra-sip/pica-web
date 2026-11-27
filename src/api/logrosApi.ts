import { httpClient } from './httpClient';

export type CodigoInsignia =
  | 'PRIMER_TORNEO_JUGADO'
  | 'PRIMER_TORNEO_GANADO'
  | 'PRIMER_PODIO'
  | 'PRIMERA_RIFA_GANADA'
  | 'DIEZ_CHECKINS_SEGUIDOS';

export interface InsigniaObtenida {
  codigo: CodigoInsignia | string;
  nombre: string;
  descripcion: string;
  icono: string;
  otorgadaEn: string;
}

export interface RifaGanada {
  rifaId: number;
  rifaTitulo: string;
  torneoId: number | null;
  torneoNombre: string | null;
  torneoSlug: string | null;
  puesto: number;
  numeroGanador: number;
  fecha: string;
}

/** GET /usuarios/{id}/logros (HU-804). */
export interface LogrosJugador {
  usuarioId: number;
  insignias: InsigniaObtenida[];
  rifasGanadas: RifaGanada[];
}

export const logrosApi = {
  ver: async (usuarioId: number): Promise<LogrosJugador> => {
    return httpClient.get<LogrosJugador>(`/usuarios/${usuarioId}/logros`);
  },
};
