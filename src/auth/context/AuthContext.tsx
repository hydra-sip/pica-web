import React, { createContext, useState, useEffect, useCallback } from 'react';
import { User, Role, AuthContextType } from '../types';
import { authApi } from '../../api/authApi';
import { getRefreshToken, onUnauthorized, clearSessionTokens, setAccessToken, setRefreshToken } from '../../api/httpClient';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Auto-restore session on app launch/reload if refreshToken exists in localStorage
  const initAuth = useCallback(async () => {
    setIsLoading(true);
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      await authApi.refreshToken();
      const userData = await authApi.getMe();
      setUser(userData);
    } catch {
      clearSessionTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Subscribe to HTTP client unauthorized events
  useEffect(() => {
    const unsubscribe = onUnauthorized(() => {
      setUser(null);
    });
    return unsubscribe;
  }, []);

  const login = async (identifier: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const response = await authApi.login(identifier, password);
      setUser(response.user);
      return response.user;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithTokens = (accessToken: string, refreshToken: string, userData: User) => {
    setAccessToken(accessToken);
    setRefreshToken(refreshToken);
    setUser(userData);
  };

  const updateUser = (updatedFields: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : null));
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  const hasPermission = (permisosReq: string | string[]): boolean => {
    if (!user || !user.permissions) return false;
    const requiredList = Array.isArray(permisosReq) ? permisosReq : [permisosReq];
    return requiredList.some((perm) => user.permissions?.includes(perm));
  };

  const hasRole = (rolesReq: Role | Role[]): boolean => {
    if (!user || !user.role) return false;
    const requiredRoles = Array.isArray(rolesReq) ? rolesReq : [rolesReq];
    return requiredRoles.includes(user.role);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    loginWithTokens,
    updateUser,
    logout,
    hasPermission,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
