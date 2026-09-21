export type RoleName =
  | 'SUPER_USUARIO'
  | 'ADMINISTRADOR'
  | 'ORGANIZADOR'
  | 'ARBITRO'
  | 'SOPORTE'
  | 'PARTICIPANTE'
  | string;

export interface ProblemErrorItem {
  campo: string;
  codigo: string;
  mensaje: string;
}

export interface ProblemDetail {
  status: number;
  detail?: string;
  codigo: string;
  errores?: ProblemErrorItem[];
}

export interface PersonaInfo {
  nombres?: string;
  apellidos?: string;
  tipoDoc?: string;
  nroDoc?: string;
  fechaNacimiento?: string;
  domicilioPostal?: string;
  telefono?: string;
}

export interface RolInfo {
  id: number | string;
  nombre: RoleName;
  nombreAmigable: string;
}

export interface User {
  id: number | string;
  username: string;
  email: string;
  estado?: string;
  tieneContrasena?: boolean;
  persona?: PersonaInfo;
  roles: RolInfo[];
  permisos: string[];
  datosCompletos: boolean;

  // Visual/form helpers for components
  name: string;
  role?: string;
  documento?: string;
  telefono?: string;
  domicilioPostal?: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface AuthContextType extends AuthState {
  login: (identificador: string, password: string) => Promise<User>;
  loginWithTokens: (accessToken: string, refreshToken: string, user: User) => void;
  updateUser: (updatedFields: Partial<User>) => void;
  logout: () => Promise<void>;
  hasPermission: (permiso: string | string[]) => boolean;
  hasRole: (role: RoleName | RoleName[]) => boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
  expiresIn?: number;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
  expiresIn?: number;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  nombres: string;
  apellidos: string;
  tipoDoc?: string;
  nroDoc?: string;
  fechaNacimiento?: string;
}

export interface RegisterResponse {
  id: number | string;
}

export interface FieldErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  nombres?: string;
  apellidos?: string;
  tipoDoc?: string;
  nroDoc?: string;
  fechaNacimiento?: string;
  domicilioPostal?: string;
  telefono?: string;
}

export interface UpdateProfileData {
  nombres?: string;
  apellidos?: string;
  tipoDoc?: string;
  nroDoc?: string;
  fechaNacimiento?: string;
  domicilioPostal?: string;
  telefono?: string;
}

export interface ChangePasswordData {
  passwordActual: string;
  passwordNueva: string;
}
