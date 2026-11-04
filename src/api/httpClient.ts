import { ProblemDetail, RefreshResponse } from '../auth/types';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
export const REFRESH_TOKEN_KEY = 'pica_refresh_token';
/** El id del usuario de la sesión guardada: lo comparten las pestañas, como el refresh token (CE4-6). */
export const SESION_USUARIO_KEY = 'pica_sesion_usuario';
/** Web Lock para que dos pestañas no renueven a la vez con el mismo refresh token. */
const LOCK_REFRESH = 'pica-refresh';

// Access Token strictly in memory
let inMemoryAccessToken: string | null = null;
let isRefreshing = false;
let activeRefreshPromise: Promise<RefreshResponse> | null = null;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

type UnauthorizedCallback = () => void;
const unauthorizedCallbacks: Set<UnauthorizedCallback> = new Set();

export class ApiError extends Error {
  problemDetail?: ProblemDetail;
  status: number;

  constructor(message: string, status: number, problemDetail?: ProblemDetail) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.problemDetail = problemDetail;
  }
}

export const onUnauthorized = (callback: UnauthorizedCallback) => {
  unauthorizedCallbacks.add(callback);
  return () => {
    unauthorizedCallbacks.delete(callback);
  };
};

const notifyUnauthorized = () => {
  unauthorizedCallbacks.forEach((cb) => cb());
};

export const getAccessToken = (): string | null => inMemoryAccessToken;

export const setAccessToken = (token: string | null) => {
  inMemoryAccessToken = token;
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const setRefreshToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
};

export const getSesionUsuario = (): string | null => localStorage.getItem(SESION_USUARIO_KEY);

export const setSesionUsuario = (id: number | string) => {
  localStorage.setItem(SESION_USUARIO_KEY, String(id));
};

export const clearSessionTokens = () => {
  inMemoryAccessToken = null;
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(SESION_USUARIO_KEY);
};

/**
 * Corre `fn` con el lock de la renovación tomado: si otra pestaña está renovando, espera a que termine. Sin
 * Web Locks (navegadores viejos) corre directo, como antes.
 */
const conLockDeRenovacion = <T>(fn: () => Promise<T>): Promise<T> =>
  typeof navigator !== 'undefined' && navigator.locks
    ? navigator.locks.request(LOCK_REFRESH, fn)
    : fn();

export const performRefreshToken = async (): Promise<RefreshResponse> => {
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  if (!getRefreshToken()) {
    clearSessionTokens();
    notifyUnauthorized();
    throw new ApiError('No existe refresh token guardado', 401);
  }

  activeRefreshPromise = conLockDeRenovacion(async () => {
    try {
      // Se lee recién con el lock tomado: si otra pestaña lo acaba de rotar, se usa el nuevo y no el que ya
      // se gastó (el back lo tomaría como robo, REFRESH_REUTILIZADO, y cerraría todas las sesiones).
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        throw new ApiError('No existe refresh token guardado', 401);
      }
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        let problemDetail: ProblemDetail | undefined;
        try {
          problemDetail = await response.json();
        } catch {
          // ignore
        }
        throw new ApiError(
          problemDetail?.detail || problemDetail?.codigo || 'Refresh token expirado o inválido',
          response.status,
          problemDetail
        );
      }

      const data: RefreshResponse = await response.json();
      setAccessToken(data.accessToken);
      if (data.refreshToken) {
        setRefreshToken(data.refreshToken);
      }
      return data;
    } finally {
      activeRefreshPromise = null;
    }
  });

  return activeRefreshPromise;
};

export interface RequestOptions extends RequestInit {
  _retry?: boolean;
  /** La respuesta es un archivo (el PDF del reglamento): vuelve como Blob en lugar de JSON. */
  comoBlob?: boolean;
  params?: Record<string, string | number | boolean | undefined | null>;
}

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export async function customFetch<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  let rawUrl = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  if (options.params) {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      rawUrl += (rawUrl.includes('?') ? '&' : '?') + queryString;
    }
  }

  const url = rawUrl;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Inject Bearer token if available
  if (inMemoryAccessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${inMemoryAccessToken}`);
  }

  const config: RequestOptions = {
    ...options,
    headers,
  };

  let response = await fetch(url, config);

  // Check for 401 Unauthorized (and avoid refresh loop on /auth/login, /auth/verificar, or /auth/refresh)
  const isAuthRoute =
    endpoint.includes('/auth/login') ||
    endpoint.includes('/auth/verificar') ||
    endpoint.includes('/auth/refresh');

  if (response.status === 401 && !isAuthRoute && !config._retry) {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      clearSessionTokens();
      notifyUnauthorized();
      throw new ApiError('No autorizado', 401, { status: 401, codigo: 'NO_AUTENTICADO' });
    }

    if (isRefreshing) {
      return new Promise<T>((resolve, reject) => {
        failedQueue.push({
          resolve: () => {
            const newHeaders = new Headers(config.headers);
            if (inMemoryAccessToken) {
              newHeaders.set('Authorization', `Bearer ${inMemoryAccessToken}`);
            }
            fetch(url, { ...config, headers: newHeaders })
              .then(async (res) => {
                if (!res.ok) throw await res.json();
                return res.json();
              })
              .then(resolve)
              .catch(reject);
          },
          reject: (err) => reject(err),
        });
      });
    }

    config._retry = true;
    isRefreshing = true;

    try {
      const refreshData = await performRefreshToken();
      const newAccessToken = refreshData.accessToken;

      processQueue(null, newAccessToken);

      // Retry original failed request
      const retryHeaders = new Headers(config.headers);
      retryHeaders.set('Authorization', `Bearer ${newAccessToken}`);

      response = await fetch(url, { ...config, headers: retryHeaders });
    } catch (refreshErr: unknown) {
      processQueue(refreshErr instanceof Error ? refreshErr : new Error(String(refreshErr)), null);
      clearSessionTokens();
      notifyUnauthorized();
      throw new ApiError('Sesión expirada. Por favor, iniciá sesión nuevamente.', 401);
    } finally {
      isRefreshing = false;
    }
  }

  if (response.status === 204) {
    return {} as T;
  }

  if (!response.ok) {
    let problemDetail: ProblemDetail | undefined;
    let errorMsg = `Error HTTP ${response.status}`;

    try {
      const data = await response.json();
      if (data && typeof data === 'object') {
        // Se queda con todo el cuerpo: algunos códigos traen campos propios (faltantes, sumaPremios...).
        const problema: ProblemDetail = {
          ...data,
          status: data.status || response.status,
          codigo: data.codigo || data.error || 'ERROR_DESCONOCIDO',
          detail: data.detail || data.message || data.error,
          errores: data.errores,
        };
        problemDetail = problema;
        errorMsg = problema.detail || problema.codigo || errorMsg;
      }
    } catch {
      // Body couldn't be parsed as JSON
    }

    throw new ApiError(errorMsg, response.status, problemDetail);
  }

  if (options.comoBlob) {
    return (await response.blob()) as T;
  }

  // 202 y otros éxitos pueden venir sin cuerpo
  const texto = await response.text();
  return (texto ? JSON.parse(texto) : {}) as T;
}

export const httpClient = {
  get: <T = unknown>(endpoint: string, options?: RequestOptions) =>
    customFetch<T>(endpoint, { ...options, method: 'GET' }),
  post: <T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    customFetch<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    customFetch<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T = unknown>(endpoint: string, options?: RequestOptions) =>
    customFetch<T>(endpoint, { ...options, method: 'DELETE' }),
};
