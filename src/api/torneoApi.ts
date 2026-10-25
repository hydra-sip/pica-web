import { httpClient } from './httpClient';
import { TorneoResumen, TorneoDetalle, PageResponse, FiltrosTorneo } from '../torneos/types/torneo';

export const torneoApi = {
  /**
   * Obtiene la lista paginada de torneos públicos con filtros opcionales.
   * Endpoint público (no requiere token de autenticación).
   */
  getTorneosResumen: async (filtros: FiltrosTorneo = {}): Promise<PageResponse<TorneoResumen>> => {
    const params: Record<string, string | number | undefined> = {};

    if (filtros.disciplina && filtros.disciplina.trim() !== '') {
      params.disciplina = filtros.disciplina.trim();
    }

    if (filtros.estado && filtros.estado.trim() !== '') {
      params.estado = filtros.estado.trim();
    }

    if (typeof filtros.page === 'number') {
      params.page = filtros.page;
    }

    if (typeof filtros.size === 'number') {
      params.size = filtros.size;
    }

    if (filtros.sort && filtros.sort.trim() !== '') {
      params.sort = filtros.sort.trim();
    }

    return httpClient.get<PageResponse<TorneoResumen>>('/torneos/resumen', {
      params,
    });
  },

  /**
   * Obtiene el detalle público de un torneo por su slug identificador.
   * Endpoint público (no requiere token de autenticación).
   */
  getTorneoBySlug: async (slug: string): Promise<TorneoDetalle> => {
    return httpClient.get<TorneoDetalle>(`/torneos/slug/${encodeURIComponent(slug)}`);
  },
};
