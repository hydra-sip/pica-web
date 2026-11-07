import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AvisoDeNavegacion } from './AvisoDeNavegacion';
import { ScrollAlInicio } from './ScrollAlInicio';

let estadoActual: unknown;
const SeguirEstado: React.FC = () => {
  estadoActual = useLocation().state;
  return null;
};

const Origen: React.FC = () => {
  const navigate = useNavigate();
  return (
    <>
      <button type="button" onClick={() => navigate('/destino', { state: { aviso: 'Guardado.' } })}>
        Guardar
      </button>
      <Link to="/otra">Otra</Link>
    </>
  );
};

const Destino: React.FC = () => <Link to="/otra">Otra</Link>;

const app = (inicial = '/') =>
  render(
    <MemoryRouter initialEntries={[inicial]}>
      <ScrollAlInicio />
      <AvisoDeNavegacion />
      <SeguirEstado />
      <Routes>
        <Route path="/" element={<Origen />} />
        <Route path="/destino" element={<Destino />} />
        <Route path="/otra" element={<p>Otra página</p>} />
      </Routes>
    </MemoryRouter>
  );

describe('navegación (CE4-4)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('cada página nueva arranca desde arriba', async () => {
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    app();
    scroll.mockClear();

    await userEvent.click(screen.getByRole('link', { name: 'Otra' }));

    expect(await screen.findByText('Otra página')).toBeInTheDocument();
    expect(scroll).toHaveBeenCalledWith(0, 0);
  });

  it('el aviso de la navegación se muestra una vez: sale del historial y no sigue en la página siguiente', async () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    app();

    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Guardado.');
    expect(estadoActual).toBeNull(); // recargar no lo vuelve a mostrar

    await userEvent.click(screen.getByRole('link', { name: 'Otra' }));
    expect(await screen.findByText('Otra página')).toBeInTheDocument();
    expect(screen.queryByText('Guardado.')).not.toBeInTheDocument();
  });
});
