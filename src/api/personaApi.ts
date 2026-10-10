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

/** GET /admin/personas/{id}; también lo devuelven el alta, la edición y reactivar. */
export interface PersonaDetalle {
  id: number;
  nombres: string;
  apellidos: string;
  tipoDoc?: string | null;
  nroDoc?: string | null;
  fechaNacimiento?: string | null;
  domicilioPostal?: string | null;
  telefono?: string | null;
  descripcion?: string | null;
  estado: 'ACTIVO' | 'INACTIVO';
  eliminado: boolean;
  eliminadoEn?: string | null;
  creadoEn: string;
  modificadoEn?: string | null;
  usuario?: {
    id: number;
    username: string;
    email: string;
    estado: 'ACTIVO' | 'BLOQUEADO' | 'PENDIENTE_VERIFICACION';
    eliminado: boolean;
  } | null;
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

  getPersona: async (id: number): Promise<PersonaDetalle> => {
    return httpClient.get<PersonaDetalle>(`/admin/personas/${id}`);
  },

  crear: async (payload: PersonaPayload): Promise<PersonaDetalle> => {
    return httpClient.post<PersonaDetalle>('/admin/personas', payload);
  },

  actualizar: async (id: number, payload: PersonaPayload): Promise<PersonaDetalle> => {
    return httpClient.put<PersonaDetalle>(`/admin/personas/${id}`, payload);
  },

  eliminar: async (id: number): Promise<void> => {
    return httpClient.delete<void>(`/admin/personas/${id}`);
  },

  reactivar: async (id: number): Promise<PersonaDetalle> => {
    return httpClient.post<PersonaDetalle>(`/admin/personas/${id}/reactivar`);
  },
};
