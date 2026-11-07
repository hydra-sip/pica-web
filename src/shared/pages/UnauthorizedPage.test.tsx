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

  it('el botón "Volver" navega hacia atrás (navigate(-1)) cuando hay historial previo en la navegación', async () => {
    const user = userEvent.setup();
    const originalLength = window.history.length;
    Object.defineProperty(window.history, 'length', { value: 3, configurable: true });

    render(
      <MemoryRouter initialEntries={['/unauthorized']}>
        <UnauthorizedPage />
      </MemoryRouter>
    );

    const botonVolver = screen.getByRole('button', { name: 'Volver' });
    expect(botonVolver).toBeInTheDocument();

    await user.click(botonVolver);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(-1);

    Object.defineProperty(window.history, 'length', { value: originalLength, configurable: true });
  });

  it('el botón "Volver" realiza fallback al inicio (navigate("/")) cuando no hay historial previo', async () => {
    const user = userEvent.setup();
    const originalLength = window.history.length;
    Object.defineProperty(window.history, 'length', { value: 1, configurable: true });

    render(
      <MemoryRouter initialEntries={['/unauthorized']}>
        <UnauthorizedPage />
      </MemoryRouter>
    );

    const botonVolver = screen.getByRole('button', { name: 'Volver' });
    await user.click(botonVolver);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/');

    Object.defineProperty(window.history, 'length', { value: originalLength, configurable: true });
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
