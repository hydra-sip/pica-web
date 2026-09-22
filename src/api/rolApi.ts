import { httpClient } from './httpClient';
import { PageResponse } from './usuarioApi';

export interface RolResumen {
  id: number;
  nombre: string;
  nombreAmigable: string;
  descripcion?: string | null;
  estado: 'ACTIVO' | 'INACTIVO';
  esSistema: boolean;
  eliminado: boolean;
  cantidadUsuarios?: number;
}

export interface RolDetalle extends RolResumen {
  permisos: string[];
}

export interface RolPayload {
  nombre: string;
  nombreAmigable: string;
  descripcion?: string | null;
  estado?: 'ACTIVO' | 'INACTIVO';
}

export const rolApi = {
  getRoles: async (params?: {
    q?: string;
    estado?: string;
    incluirEliminados?: boolean;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PageResponse<RolResumen>> => {
    return httpClient.get<PageResponse<RolResumen>>('/admin/roles', { params });
  },

  getRol: async (id: number): Promise<RolDetalle> => {
    return httpClient.get<RolDetalle>(`/admin/roles/${id}`);
  },

  crear: async (payload: RolPayload): Promise<RolResumen> => {
    return httpClient.post<RolResumen>('/admin/roles', payload);
  },

  actualizar: async (id: number, payload: RolPayload): Promise<RolResumen> => {
    return httpClient.put<RolResumen>(`/admin/roles/${id}`, payload);
  },

  eliminar: async (id: number): Promise<void> => {
    return httpClient.delete<void>(`/admin/roles/${id}`);
  },

  reactivar: async (id: number): Promise<RolResumen> => {
    return httpClient.post<RolResumen>(`/admin/roles/${id}/reactivar`);
  },

  updatePermisos: async (id: number, permisos: string[]): Promise<RolDetalle> => {
    return httpClient.put<RolDetalle>(`/admin/roles/${id}/permisos`, { permisos });
  },

  getPermisosCatalogo: async (): Promise<any[]> => {
    return httpClient.get<any[]>('/admin/permisos');
  },
};
