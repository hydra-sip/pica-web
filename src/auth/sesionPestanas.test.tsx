import { act, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import { authApi } from '../api/authApi';
import {
  performRefreshToken,
  REFRESH_TOKEN_KEY,
  SESION_USUARIO_KEY,
  setRefreshToken,
} from '../api/httpClient';
import { server } from '../mocks/server';
import { AvisoSesion } from './components/AvisoSesion';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const Quien: React.FC = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <p>Cargando</p>;
  return <p>{user ? `Sesión de ${user.username}` : 'Sin sesión'}</p>;
};

const renderApp = () =>
  render(
    <AuthProvider>
      <AvisoSesion />
      <Quien />
    </AuthProvider>
  );

/** Lo que ve esta pestaña cuando otra escribe en localStorage. */
const otraPestana = (key: string, newValue: string | null) =>
  act(() => {
    if (newValue === null) localStorage.removeItem(key);
    else localStorage.setItem(key, newValue);
    window.dispatchEvent(new StorageEvent('storage', { key, newValue }));
  });

describe('renovación con varias pestañas (CE4-6)', () => {
  afterEach(() => {
    delete (navigator as { locks?: unknown }).locks;
  });

  it('con el lock tomado usa el refresh token que dejó la otra pestaña, no el que ya se gastó', async () => {
    setRefreshToken('refresh-viejo');
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: {
        // Mientras esta pestaña esperaba el lock, la otra renovó y rotó el token.
        request: (_nombre: string, fn: () => Promise<unknown>) => {
          setRefreshToken('refresh-rotado-por-otra');
          return fn();
        },
      },
    });
    let usado: string | undefined;
    server.use(
      http.post(`${API_URL}/auth/refresh`, async ({ request }) => {
        usado = ((await request.json()) as { refreshToken: string }).refreshToken;
        return HttpResponse.json({ accessToken: 'a2', refreshToken: 'r3', tokenType: 'Bearer' });
      })
    );

    await performRefreshToken();

    expect(usado).toBe('refresh-rotado-por-otra');
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('r3');
  });
});

describe('sesión compartida entre pestañas (CE4-6)', () => {
  it('si otra pestaña entra con otra cuenta, avisa y se pone al día', async () => {
    await authApi.login('usuario', 'user123');
    renderApp();
    await screen.findByText(/^Sesión de /);
    expect(localStorage.getItem(SESION_USUARIO_KEY)).not.toBeNull();

    server.use(
      http.get(`${API_URL}/me`, () =>
        HttpResponse.json({
          id: 999,
          username: 'otra',
          email: 'otra@pica.local',
          roles: [],
          permisos: [],
        })
      )
    );
    otraPestana(SESION_USUARIO_KEY, '999');

    expect(await screen.findByText('Sesión de otra')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/otra cuenta en otra pestaña/);
  });

  it('si otra pestaña cierra la sesión, esta también la cierra y avisa', async () => {
    await authApi.login('usuario', 'user123');
    renderApp();
    await screen.findByText(/^Sesión de /);

    otraPestana(REFRESH_TOKEN_KEY, null);
    otraPestana(SESION_USUARIO_KEY, null);

    await waitFor(() => expect(screen.getByText('Sin sesión')).toBeInTheDocument());
    expect(screen.getByRole('status')).toHaveTextContent('Cerraste la sesión en otra pestaña.');
  });

  it('si la otra pestaña renueva con la misma cuenta, no pasa nada', async () => {
    await authApi.login('usuario', 'user123');
    renderApp();
    await screen.findByText(/^Sesión de /);

    otraPestana(REFRESH_TOKEN_KEY, 'refresh-nuevo');

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText(/^Sesión de /)).toBeInTheDocument();
  });
});
