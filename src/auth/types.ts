export type Role = 'ADMIN' | 'USER' | 'GESTOR' | string;

export interface Permission {
  id: string;
  code: string;
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

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
}

export interface VerifyEmailResponse {
  success: boolean;
  message: string;
  error?: string;
}

export interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}
