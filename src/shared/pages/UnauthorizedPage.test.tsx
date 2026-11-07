import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { UnauthorizedPage } from './UnauthorizedPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('CE4-1 (PICA-302): Pantalla de Acceso Denegado sin credenciales filtradas', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    vi.restoreAllMocks();
  });

  it('renderiza el título "Acceso Denegado", código 403 y mensaje explicativo para el módulo de administración', () => {
    render(
      <MemoryRouter initialEntries={['/unauthorized']}>
        <UnauthorizedPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Acceso Denegado' })).toBeInTheDocument();
    expect(screen.getByText('403')).toBeInTheDocument();
    expect(
      screen.getByText(/no poseés los permisos necesarios ni el rol adecuado para acceder a esta sección del módulo de administración/i)
    ).toBeInTheDocument();

    // No debe mostrar nunca credenciales de administración (CE4-1)
    expect(screen.queryByText(/admin123/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/admin@pica\.edu\.ar/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ejemplo de control de acceso/i)).not.toBeInTheDocument();
  });

  it('muestra el mensaje contextualizado cuando la redirección proviene de un flujo de inscripción', () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/unauthorized',
            state: { from: { pathname: '/torneos/apertura/inscripcion' } },
          },
        ]}
      >
        <UnauthorizedPage />
      </MemoryRouter>
    );

    expect(
      screen.getByText(/tu cuenta no tiene habilitada la inscripción a torneos/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/módulo de administración/i)).not.toBeInTheDocument();

    // Sin credenciales
    expect(screen.queryByText(/admin123/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/admin@pica\.edu\.ar/i)).not.toBeInTheDocument();
  });

  // react-router guarda en `history.state.idx` la posición dentro de la app.
  const clickEnVolverCon = async (idx: number | null, length: number) => {
    const user = userEvent.setup();
    const originalLength = window.history.length;
    window.history.replaceState(idx === null ? null : { idx }, '');
    Object.defineProperty(window.history, 'length', { value: length, configurable: true });

    render(
      <MemoryRouter initialEntries={['/unauthorized']}>
        <UnauthorizedPage />
      </MemoryRouter>
    );

    try {
      await user.click(screen.getByRole('button', { name: 'Volver' }));
    } finally {
      window.history.replaceState(null, '');
      Object.defineProperty(window.history, 'length', { value: originalLength, configurable: true });
    }
  };

  it('el botón "Volver" navega hacia atrás (navigate(-1)) cuando hay una página previa de la app', async () => {
    await clickEnVolverCon(2, 3);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('el botón "Volver" realiza fallback al inicio (navigate("/")) cuando no hay historial previo', async () => {
    await clickEnVolverCon(null, 1);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('el botón "Volver" lleva al inicio si se llegó desde otro sitio, sin sacar al usuario de la app', async () => {
    await clickEnVolverCon(0, 4);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('ofrece enlaces secundarios visibles y funcionales para "Ir al Inicio" y "Iniciar sesión con otra cuenta"', () => {
    render(
      <MemoryRouter initialEntries={['/unauthorized']}>
        <UnauthorizedPage />
      </MemoryRouter>
    );

    const linkInicio = screen.getByRole('link', { name: 'Ir al Inicio' });
    expect(linkInicio).toHaveAttribute('href', '/');

    const linkLogin = screen.getByRole('link', { name: 'Iniciar sesión con otra cuenta' });
    expect(linkLogin).toHaveAttribute('href', '/auth/login');
  });

  it('bajo ninguna circunstancia incluye usuario, clave ni correos institucionales de ejemplo en el HTML', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/unauthorized']}>
        <UnauthorizedPage />
      </MemoryRouter>
    );

    const html = container.innerHTML;
    expect(html).not.toContain('admin123');
    expect(html).not.toContain('admin@pica.edu.ar');
    expect(html).not.toContain('pica.edu.ar');
    expect(html).not.toContain('Ejemplo de Control de Acceso');
  });
});
