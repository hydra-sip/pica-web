import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { AuthProvider } from '../auth/context/AuthContext';
import { AppRoutes } from '../routes/AppRoutes';

// Usuarios de handlers.ts: el participante tiene INSCRIPCION_GESTIONAR y el organizador no.
const CREDENCIALES = {
  participante: { identificador: 'usuario', password: 'user123' },
  sinPermiso: { identificador: 'organizador', password: 'org123' },
} as const;

export interface OpcionesRuta {
  /** Con quién se entra. `anonimo` es sin sesión. Por defecto, `participante`. */
  usuario?: keyof typeof CREDENCIALES | 'anonimo';
  /**
   * Arma el estado de partida con la API (por ejemplo un borrador con `inscripcionApi.crear`). Corre
   * con la sesión ya iniciada y antes de renderizar; los mocks se reinician solos entre test y test.
   */
  prepara?: () => Promise<void>;
}

/**
 * Renderiza las rutas reales de la app (AppRoutes con su layout, sesión y permisos) en `ruta`,
 * contra los handlers de MSW, con el usuario ya logueado. Devuelve el resultado de Testing Library,
 * un `user` de user-event y `ubicacion()` con la ruta actual (path y query) para chequear redirecciones.
 */
export const renderRuta = async (
  ruta: string,
  { usuario = 'participante', prepara }: OpcionesRuta = {}
) => {
  if (usuario !== 'anonimo') {
    const { identificador, password } = CREDENCIALES[usuario];
    await authApi.login(identificador, password);
  }
  await prepara?.();

  let actual = ruta;
  const SeguirUbicacion: React.FC = () => {
    const { pathname, search } = useLocation();
    actual = pathname + search;
    return null;
  };

  const resultado = render(
    <AuthProvider>
      <MemoryRouter initialEntries={[ruta]}>
        <SeguirUbicacion />
        <AppRoutes />
      </MemoryRouter>
    </AuthProvider>
  );

  return { ...resultado, user: userEvent.setup(), ubicacion: () => actual };
};
