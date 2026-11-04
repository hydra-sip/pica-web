import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, RoleName, AuthContextType } from '../types';
import { authApi } from '../../api/authApi';
import {
  getRefreshToken,
  onUnauthorized,
  clearSessionTokens,
  setAccessToken,
  setSesionUsuario,
  SESION_USUARIO_KEY,
} from '../../api/httpClient';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  /** Lo que pasó en otra pestaña con la sesión compartida (CE4-6). */
  const [avisoSesion, setAvisoSesion] = useState<string | null>(null);
  const userRef = useRef<User | null>(null);
  userRef.current = user;

  /** El usuario de esta pestaña, también para las demás. */
  const entrar = useCallback((u: User) => {
    setSesionUsuario(u.id);
    setUser(u);
  }, []);

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
      entrar(userData);
    } catch {
      clearSessionTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [entrar]);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Las pestañas comparten el refresh token: si otra cierra la sesión o entra con otra cuenta, esta se pone al día
  // en lugar de seguir mostrando a un usuario mientras el back atiende a otro.
  useEffect(() => {
    const alCambiar = (e: StorageEvent) => {
      if (e.key !== SESION_USUARIO_KEY && e.key !== null) return;
      const actual = userRef.current;
      if (e.newValue === null) {
        if (!actual) return;
        setAccessToken(null);
        setUser(null);
        setAvisoSesion('Cerraste la sesión en otra pestaña.');
      } else if (!actual || String(actual.id) !== e.newValue) {
        setAccessToken(null);
        setAvisoSesion(
          actual
            ? 'Iniciaste sesión con otra cuenta en otra pestaña: esta se actualizó con esa cuenta.'
            : null
        );
        initAuth();
      }
    };
    window.addEventListener('storage', alCambiar);
    return () => window.removeEventListener('storage', alCambiar);
  }, [initAuth]);

  // Subscribe to HTTP client unauthorized events
  useEffect(() => {
    const unsubscribe = onUnauthorized(() => {
      setUser(null);
    });
    return unsubscribe;
  }, []);

  const login = async (identificador: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const loggedUser = await authApi.login(identificador, password);
      entrar(loggedUser);
      setAvisoSesion(null);
      return loggedUser;
    } finally {
      setIsLoading(false);
    }
  };

  // Canjea el código del login con Google (guarda los tokens) y carga el usuario, como login.
  // Memoizada porque el callback la tiene en las deps de su effect.
  const loginWithOAuthCode = useCallback(
    async (code: string): Promise<User> => {
      const loggedUser = await authApi.exchangeOAuthCode(code);
      entrar(loggedUser);
      setAvisoSesion(null);
      return loggedUser;
    },
    [entrar]
  );

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
    if (!user) return false;

    // Check permissions array directly from GET /me
    if (!user.permisos) return false;
    const requiredList = Array.isArray(permisosReq) ? permisosReq : [permisosReq];
    return requiredList.some((perm) => user.permisos.includes(perm));
  };

  const hasRole = (rolesReq: RoleName | RoleName[]): boolean => {
    if (!user || !user.roles) return false;
    const requiredRoles = Array.isArray(rolesReq) ? rolesReq : [rolesReq];
    const userRoleNames = user.roles.map((r) => r.nombre);
    return requiredRoles.some((r) => userRoleNames.includes(r));
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    loginWithOAuthCode,
    updateUser,
    logout,
    hasPermission,
    hasRole,
    avisoSesion,
    descartarAvisoSesion: () => setAvisoSesion(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
