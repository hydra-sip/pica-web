import { httpClient } from './httpClient';
import { PageResponse } from './usuarioApi';

/** Fila de GET /equipos/mios: un equipo del capitán, para elegirlo al inscribirse. */
export interface EquipoResumen {
  id: number;
  nombre: string;
}

// PICA-234: exige INSCRIPCION_GESTIONAR. Solo los equipos de los que el usuario es capitán.
export const equipoApi = {
  listarMios: async (params?: {
    page?: number;
    size?: number;
  }): Promise<PageResponse<EquipoResumen>> => {
    return httpClient.get<PageResponse<EquipoResumen>>('/equipos/mios', { params });
  },
};
