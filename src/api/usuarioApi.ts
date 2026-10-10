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
    tipoDoc?: string | null;
    nroDoc?: string | null;
  };
  roles: RolMinimo[];
  creadoEn: string;
}

/** GET /admin/usuarios/{id}; también lo devuelven el alta, la edición, reactivar y los roles. */
export interface UsuarioDetalle {
  id: number;
  username: string;
  email: string;
  descripcion?: string | null;
  estado: 'ACTIVO' | 'BLOQUEADO' | 'PENDIENTE_VERIFICACION';
  emailVerificado: boolean;
  eliminado: boolean;
  eliminadoEn?: string | null;
  protegido: boolean;
  tieneContrasena: boolean;
  conGoogle: boolean;
  persona: {
    id: number;
    nombres: string;
    apellidos: string;
    tipoDoc?: string | null;
    nroDoc?: string | null;
    estado: 'ACTIVO' | 'INACTIVO';
  };
  roles: RolMinimo[];
  creadoEn: string;
  modificadoEn?: string | null;
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
  descripcion?: string | null;
}

export const usuarioApi = {
  getUsuarios: async (params?: {
    q?: string;
    estado?: string;
    rol?: number;
    incluirEliminados?: boolean;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PageResponse<UsuarioResumen>> => {
    return httpClient.get<PageResponse<UsuarioResumen>>('/admin/usuarios', { params });
  },

  getUsuario: async (id: number): Promise<UsuarioDetalle> => {
    return httpClient.get<UsuarioDetalle>(`/admin/usuarios/${id}`);
  },

  crear: async (payload: UsuarioCreatePayload): Promise<UsuarioDetalle> => {
    return httpClient.post<UsuarioDetalle>('/admin/usuarios', payload);
  },

  actualizar: async (id: number, payload: UsuarioUpdatePayload): Promise<UsuarioDetalle> => {
    return httpClient.put<UsuarioDetalle>(`/admin/usuarios/${id}`, payload);
  },

  eliminar: async (id: number): Promise<void> => {
    return httpClient.delete<void>(`/admin/usuarios/${id}`);
  },

  reactivar: async (id: number): Promise<UsuarioDetalle> => {
    return httpClient.post<UsuarioDetalle>(`/admin/usuarios/${id}/reactivar`);
  },

  updatePassword: async (id: number, password: string): Promise<void> => {
    return httpClient.put<void>(`/admin/usuarios/${id}/password`, { password });
  },

  updateRoles: async (id: number, roles: number[]): Promise<UsuarioDetalle> => {
    return httpClient.put<UsuarioDetalle>(`/admin/usuarios/${id}/roles`, { roles });
  },
};
