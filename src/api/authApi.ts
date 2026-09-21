import { httpClient, setAccessToken, setRefreshToken, getRefreshToken, clearSessionTokens } from './httpClient';
import {
  LoginResponse,
  RefreshResponse,
  User,
  RegisterData,
  RegisterResponse,
  UpdateProfileData,
  ChangePasswordData,
} from '../auth/types';

export const authApi = {
  login: async (identificador: string, password: string): Promise<User> => {
    // 1. Post credentials to /auth/login (returns only tokens according to OpenAPI contract)
    const tokens = await httpClient.post<LoginResponse>('/auth/login', { identificador, password });
    
    setAccessToken(tokens.accessToken);
    setRefreshToken(tokens.refreshToken);

    // 2. Fetch logged-in user profile from GET /me
    return await authApi.getMe();
  },

  exchangeOAuthCode: async (code: string): Promise<User> => {
    const tokens = await httpClient.post<LoginResponse>('/auth/exchange', { code });
    setAccessToken(tokens.accessToken);
    setRefreshToken(tokens.refreshToken);
    return await authApi.getMe();
  },

  register: async (registerData: RegisterData): Promise<RegisterResponse> => {
    return await httpClient.post<RegisterResponse>('/auth/registro', registerData);
  },

  verifyEmail: async (token: string): Promise<void> => {
    await httpClient.get(`/auth/verificar?token=${encodeURIComponent(token)}`);
  },

  getMe: async (): Promise<User> => {
    const rawUser = await httpClient.get<any>('/me');

    // Adapt openapi.yaml response structure to User interface with UI compatibility helpers
    const persona = rawUser.persona || {};
    const nombres = persona.nombres || rawUser.usuario?.username || rawUser.username || '';
    const apellidos = persona.apellidos || '';
    const fullName = `${nombres} ${apellidos}`.trim() || rawUser.username || rawUser.email || 'Usuario';
    const mainRole = rawUser.roles?.[0]?.nombre || rawUser.roles?.[0]?.nombreAmigable || 'PARTICIPANTE';

    const user: User = {
      id: rawUser.usuario?.id || rawUser.id || 'usr_000',
      username: rawUser.usuario?.username || rawUser.username || '',
      email: rawUser.usuario?.email || rawUser.email || '',
      estado: rawUser.usuario?.estado || rawUser.estado || 'ACTIVO',
      tieneContrasena: rawUser.usuario?.tieneContrasena ?? true,
      persona: rawUser.persona,
      roles: rawUser.roles || [{ id: 'r1', nombre: mainRole, nombreAmigable: mainRole }],
      permisos: rawUser.permisos || [],
      datosCompletos: rawUser.datosCompletos ?? Boolean(persona.nroDoc && persona.telefono),
      
      // Helpers
      name: fullName,
      role: mainRole,
      documento: persona.nroDoc || rawUser.documento || '',
      telefono: persona.telefono || rawUser.telefono || '',
    };

    return user;
  },

  updateProfile: async (data: UpdateProfileData): Promise<User> => {
    await httpClient.put<any>('/me', data);
    return await authApi.getMe();
  },

  changePassword: async (data: ChangePasswordData): Promise<{ message: string }> => {
    return await httpClient.post<{ message: string }>('/auth/change-password', data);
  },

  refreshToken: async (): Promise<RefreshResponse> => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error('No existe refresh token guardado');
    }
    const data = await httpClient.post<RefreshResponse>('/auth/refresh', { refreshToken });
    setAccessToken(data.accessToken);
    if (data.refreshToken) {
      setRefreshToken(data.refreshToken);
    }
    return data;
  },

  logout: async (): Promise<void> => {
    try {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        await httpClient.post('/auth/logout', { refreshToken });
      }
    } catch {
      // Ignore network errors on logout to ensure client cleanup
    } finally {
      clearSessionTokens();
    }
  },
};
