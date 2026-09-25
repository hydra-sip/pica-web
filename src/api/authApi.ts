import {
  httpClient,
  setAccessToken,
  setRefreshToken,
  getRefreshToken,
  clearSessionTokens,
  performRefreshToken,
} from './httpClient';
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
    const tokens = await httpClient.post<LoginResponse>('/auth/login', { identificador, password });
    
    setAccessToken(tokens.accessToken);
    setRefreshToken(tokens.refreshToken);

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
    const persona = rawUser.persona || {};
    const nombres = persona.nombres || '';
    const apellidos = persona.apellidos || '';
    const fullName = `${nombres} ${apellidos}`.trim() || rawUser.usuario?.username || rawUser.email || '';
    const roles = rawUser.roles || [];
    const mainRole = roles[0]?.nombre || roles[0]?.nombreAmigable || '';

    const user: User = {
      id: rawUser.usuario?.id ?? rawUser.id,
      username: rawUser.usuario?.username ?? rawUser.username,
      email: rawUser.usuario?.email ?? rawUser.email,
      estado: rawUser.usuario?.estado ?? rawUser.estado,
      tieneContrasena: rawUser.usuario?.tieneContrasena ?? rawUser.tieneContrasena,
      persona: rawUser.persona,
      roles: rawUser.roles,
      permisos: rawUser.permisos || [],
      datosCompletos: rawUser.datosCompletos,
      
      // UI Helpers
      name: fullName,
      role: mainRole,
      documento: persona.nroDoc,
      telefono: persona.telefono,
      domicilioPostal: persona.domicilioPostal,
    };

    return user;
  },

  updateProfile: async (data: UpdateProfileData): Promise<User> => {
    await httpClient.put<any>('/me', data);
    return await authApi.getMe();
  },

  changePassword: async (data: ChangePasswordData): Promise<{ message: string }> => {
    // Contrato OpenAPI oficial: PUT /me/password
    return await httpClient.put<{ message: string }>('/me/password', data);
  },

  refreshToken: async (): Promise<RefreshResponse> => {
    return await performRefreshToken();
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
