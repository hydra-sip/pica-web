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
  codigo: string; // ej: 'EMAIL_NO_VERIFICADO', 'USUARIO_BLOQUEADO', 'CREDENCIALES_INVALIDAS', 'USERNAME_DUPLICADO', 'EMAIL_DUPLICADO', 'VALIDACION'
  errores?: ProblemErrorItem[];
}

export interface PersonaInfo {
  nombres?: string;
  apellidos?: string;
  tipoDoc?: string;
  nroDoc?: string;
  fechaNacimiento?: string;
  telefono?: string;
}

export interface RolInfo {
  id: string;
  nombre: RoleName;
  nombreAmigable: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  estado?: string;
  tieneContrasena?: boolean;
  persona?: PersonaInfo;
  roles: RolInfo[];
  permisos: string[];
  datosCompletos: boolean;

  // Helpers de compatibilidad para UI
  name: string;
  role?: string;
  documento?: string;
  telefono?: string;
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
  id: string;
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
  telefono?: string;
}

export interface UpdateProfileData {
  nombres?: string;
  apellidos?: string;
  tipoDoc?: string;
  nroDoc?: string;
  fechaNacimiento?: string;
  telefono?: string;
}

export interface ChangePasswordData {
  passwordActual: string;
  passwordNueva: string;
}
