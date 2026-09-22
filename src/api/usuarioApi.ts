import { httpClient } from './httpClient';

export interface PageResponse<T> {
  content: T[];
  page: {
    size: number;
    number: number;
    totalElements: number;
    totalPages: number;
  };
}

export interface RolMinimo {
  id: number;
  nombre: string;
  nombreAmigable: string;
}

export interface UsuarioResumen {
  id: number;
  username: string;
  email: string;
  estado: 'ACTIVO' | 'BLOQUEADO' | 'PENDIENTE_VERIFICACION';
  eliminado: boolean;
  protegido: boolean;
  persona: {
    id: number;
    nombreCompleto: string;
    tipoDoc?: string;
    nroDoc?: string;
  };
  roles: RolMinimo[];
  creadoEn: string;
}

export interface UsuarioCreatePayload {
  username: string;
  email: string;
  passwordTemporal: string;
  personaId: number;
  roles: number[];
  descripcion?: string;
  estado?: 'ACTIVO' | 'BLOQUEADO';
}

export interface UsuarioUpdatePayload {
  username: string;
  email: string;
  estado: 'ACTIVO' | 'BLOQUEADO';
  personaId: number;
  descripcion?: string;
}

export const usuarioApi = {
  getUsuarios: async (params?: {
    q?: string;
    estado?: string;
    incluirEliminados?: boolean;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PageResponse<UsuarioResumen>> => {
    return httpClient.get<PageResponse<UsuarioResumen>>('/admin/usuarios', { params });
  },

  getUsuario: async (id: number): Promise<UsuarioResumen> => {
    return httpClient.get<UsuarioResumen>(`/admin/usuarios/${id}`);
  },

  crear: async (payload: UsuarioCreatePayload): Promise<UsuarioResumen> => {
    return httpClient.post<UsuarioResumen>('/admin/usuarios', payload);
  },

  actualizar: async (id: number, payload: UsuarioUpdatePayload): Promise<UsuarioResumen> => {
    return httpClient.put<UsuarioResumen>(`/admin/usuarios/${id}`, payload);
  },

  eliminar: async (id: number): Promise<void> => {
    return httpClient.delete<void>(`/admin/usuarios/${id}`);
  },

  reactivar: async (id: number): Promise<UsuarioResumen> => {
    return httpClient.post<UsuarioResumen>(`/admin/usuarios/${id}/reactivar`);
  },

  updatePassword: async (id: number, password: string): Promise<void> => {
    return httpClient.put<void>(`/admin/usuarios/${id}/password`, { password });
  },

  updateRoles: async (id: number, roles: number[]): Promise<UsuarioResumen> => {
    return httpClient.put<UsuarioResumen>(`/admin/usuarios/${id}/roles`, { roles });
  },
};
