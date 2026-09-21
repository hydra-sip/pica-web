export type Role = 'ADMIN' | 'USER' | 'GESTOR' | string;

export interface Permission {
  id: string;
  code: string; // ej: 'admin:access', 'users:read', 'users:write'
  description?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  permissions?: string[];
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permiso: string | string[]) => boolean;
  hasRole: (role: Role | Role[]) => boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken?: string;
}
