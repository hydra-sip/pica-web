import { httpClient } from './httpClient';

export type TipoSorteo = 'TORNEO' | 'RIFA';

export interface SorteoItemResumen {
  id: number;
  tipo: TipoSorteo;
  titulo: string;
  slug?: string;
  disciplinaOInfo: string;
  fechaSorteo: string;
  compromisoHash: string;
  semilla: string;
}

export interface InscriptoVerificacion {
  id: number;
  nombre: string;
}

export interface CruceOficial {
  posicion: number;
  localId: number;
  localNombre: string;
  visitanteId: number | null;
  visitanteNombre: string | null;
  bye: boolean;
}

export interface TorneoVerificacionData {
  id: number;
  slug: string;
  nombre: string;
  disciplina: string;
  fechaSorteo: string;
  compromisoHash: string;
  listaHash: string;
  semilla: string;
  semillaFirma: string;
  inscriptos: InscriptoVerificacion[];
  resultadoOficial: {
    rondas: number;
    cruces: CruceOficial[];
  };
}

export interface PremioRifaOficial {
  puesto: number;
  descripcion: string;
  pct: number;
  numeroGanador: number;
}

export interface RifaVerificacionData {
  id: number;
  titulo: string;
  torneoNombre: string | null;
  fechaSorteo: string;
  compromisoHash: string;
  listaHash: string;
  semilla: string;
  semillaFirma: string;
  numerosVendidos: number[];
  premios: PremioRifaOficial[];
  resultadoOficial: {
    ganadores: PremioRifaOficial[];
  };
}

export const verificacionApi = {
  listarDisponibles: async (): Promise<SorteoItemResumen[]> => {
    return httpClient.get<SorteoItemResumen[]>('/verificacion/sorteos');
  },

  obtenerTorneo: async (id: number | string): Promise<TorneoVerificacionData> => {
    return httpClient.get<TorneoVerificacionData>(`/verificacion/torneo/${id}`);
  },

  obtenerRifa: async (id: number | string): Promise<RifaVerificacionData> => {
    return httpClient.get<RifaVerificacionData>(`/verificacion/rifa/${id}`);
  },
};
