import { httpClient } from './httpClient';
import { PageResponse } from './usuarioApi';

/** Lo que cualquier usuario logueado puede ver de otro, sin datos personales. */
export interface UsuarioPublico {
  id: number;
  username: string;
  nombres: string;
  apellidos: string;
}

// Para cargar la nómina. Sin permiso especial, solo usuarios activos, sin email ni documento.
export const jugadorApi = {
  /**
   * GET /usuarios?q=. Cada palabra de `q` tiene que estar en el username, los nombres o los apellidos.
   * El back responde 400 VALIDACION si `q` tiene menos de 3 caracteres sin contar los espacios de los costados.
   */
  buscar: async (
    q: string,
    params?: { page?: number; size?: number }
  ): Promise<PageResponse<UsuarioPublico>> => {
    return httpClient.get<PageResponse<UsuarioPublico>>('/usuarios', { params: { q, ...params } });
  },
};
