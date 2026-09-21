import { httpClient, setAccessToken, setRefreshToken, getRefreshToken, clearSessionTokens } from './httpClient';
import {
  LoginResponse,
  RefreshResponse,
  User,
  RegisterData,
  RegisterResponse,
  VerifyEmailResponse,
  UpdateProfileData,
  ChangePasswordData,
} from '../auth/types';

export const authApi = {
  login: async (identifier: string, password: string): Promise<LoginResponse> => {
    const data = await httpClient.post<LoginResponse>('/auth/login', { identifier, email: identifier, password });
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    return data;
  },

  exchangeOAuthCode: async (code: string): Promise<LoginResponse> => {
    const data = await httpClient.post<LoginResponse>('/auth/exchange', { code });
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    return data;
  },

  register: async (registerData: RegisterData): Promise<RegisterResponse> => {
    return await httpClient.post<RegisterResponse>('/auth/register', registerData);
  },

  verifyEmail: async (token: string): Promise<VerifyEmailResponse> => {
    return await httpClient.post<VerifyEmailResponse>('/auth/verify-email', { token });
  },

  updateProfile: async (data: UpdateProfileData): Promise<User> => {
    return await httpClient.put<User>('/auth/me', data);
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

  getMe: async (): Promise<User> => {
    return await httpClient.get<User>('/auth/me');
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
