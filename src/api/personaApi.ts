import { httpClient } from './httpClient';
import { PageResponse } from './usuarioApi';

export interface PersonaResumen {
  id: number;
  nombres: string;
  apellidos: string;
  tipoDoc?: string | null;
  nroDoc?: string | null;
  estado: 'ACTIVO' | 'INACTIVO';
  eliminado: boolean;
  tieneUsuario: boolean;
}

export interface PersonaPayload {
  nombres: string;
  apellidos: string;
  tipoDoc: string;
  nroDoc: string;
  fechaNacimiento?: string | null;
  domicilioPostal?: string | null;
  telefono?: string | null;
  descripcion?: string | null;
  estado?: 'ACTIVO' | 'INACTIVO';
}

export const personaApi = {
  getPersonas: async (params?: {
    q?: string;
    estado?: string;
    incluirEliminados?: boolean;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PageResponse<PersonaResumen>> => {
    return httpClient.get<PageResponse<PersonaResumen>>('/admin/personas', { params });
  },

  getPersona: async (id: number): Promise<PersonaResumen> => {
    return httpClient.get<PersonaResumen>(`/admin/personas/${id}`);
  },

  crear: async (payload: PersonaPayload): Promise<PersonaResumen> => {
    return httpClient.post<PersonaResumen>('/admin/personas', payload);
  },

  actualizar: async (id: number, payload: PersonaPayload): Promise<PersonaResumen> => {
    return httpClient.put<PersonaResumen>(`/admin/personas/${id}`, payload);
  },

  eliminar: async (id: number): Promise<void> => {
    return httpClient.delete<void>(`/admin/personas/${id}`);
  },

  reactivar: async (id: number): Promise<PersonaResumen> => {
    return httpClient.post<PersonaResumen>(`/admin/personas/${id}/reactivar`);
  },
};
