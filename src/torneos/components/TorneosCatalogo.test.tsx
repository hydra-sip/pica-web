import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { server } from '../../mocks/server';
import { TorneosCatalogo } from './TorneosCatalogo';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

describe('Catálogo de torneos: búsqueda y modalidad (PICA-304)', () => {
  let pedidos: URLSearchParams[];

  beforeEach(() => {
    pedidos = [];
    // Solo mira el pedido; la respuesta la da el handler normal del catálogo.
    server.use(
      http.get(`${API_URL}/torneos/resumen`, ({ request }) => {
        pedidos.push(new URL(request.url).searchParams);
      })
    );
    render(
      <MemoryRouter>
        <TorneosCatalogo />
      </MemoryRouter>
    );
  });

  const ultimoPedido = () => pedidos[pedidos.length - 1];

  it('el buscador manda q y encuentra sin tildes', async () => {
    await screen.findByText('Copa abierta');

    await userEvent.type(screen.getByPlaceholderText(/buscar por torneo/i), 'padel');

    expect(await screen.findByText('Torneo de Pádel Interfacultades')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Copa abierta')).not.toBeInTheDocument());
    expect(ultimoPedido().get('q')).toBe('padel');
    expect(ultimoPedido().has('disciplina')).toBe(false);
  });

  it('si una respuesta vieja llega última, se queda con los datos de la última consulta', async () => {
    await screen.findByText('Copa abierta');
    let liberarVieja = () => {};
    const vieja = new Promise<void>((resolve) => {
      liberarVieja = resolve;
    });
    let viejaEnCurso = false;
    server.use(
      http.get(`${API_URL}/torneos/resumen`, async ({ request }) => {
        if (new URL(request.url).searchParams.get('q') === 'pa') {
          viejaEnCurso = true;
          await vieja;
        }
      })
    );
    const buscador = screen.getByPlaceholderText(/buscar por torneo/i);

    // "pa" también trae Copa abierta; "padel", solo el de pádel.
    await userEvent.type(buscador, 'pa');
    await waitFor(() => expect(viejaEnCurso).toBe(true));
    await userEvent.type(buscador, 'del');
    expect(await screen.findByText('Torneo de Pádel Interfacultades')).toBeInTheDocument();

    liberarVieja();
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(screen.queryByText('Copa abierta')).not.toBeInTheDocument();
    expect(screen.getByText('Torneo de Pádel Interfacultades')).toBeInTheDocument();
  });

  it('el chip de modalidad manda modalidad y se combina con la búsqueda', async () => {
    await screen.findByText('Liga Abierta de Ajedrez Rápido');

    await userEvent.click(screen.getByRole('button', { name: 'Presencial' }));

    await waitFor(() =>
      expect(screen.queryByText('Liga Abierta de Ajedrez Rápido')).not.toBeInTheDocument()
    );
    expect(ultimoPedido().get('modalidad')).toBe('PRESENCIAL');
    expect(ultimoPedido().has('q')).toBe(false);

    await userEvent.click(screen.getByRole('button', { name: 'Fútbol 5' }));

    await waitFor(() => expect(ultimoPedido().get('q')).toBe('Fútbol 5'));
    expect(ultimoPedido().get('modalidad')).toBe('PRESENCIAL');
    expect(await screen.findByText('Copa abierta')).toBeInTheDocument();
  });

  it('volver a tocar el chip saca la modalidad y Todos limpia búsqueda y modalidad', async () => {
    await screen.findByText('Copa abierta');
    const presencial = screen.getByRole('button', { name: 'Presencial' });

    await userEvent.click(presencial);
    await waitFor(() => expect(ultimoPedido().get('modalidad')).toBe('PRESENCIAL'));

    await userEvent.click(presencial);
    await waitFor(() => expect(ultimoPedido().has('modalidad')).toBe(false));

    await userEvent.click(presencial);
    await userEvent.click(screen.getByRole('button', { name: 'Pádel' }));
    await waitFor(() => expect(ultimoPedido().get('q')).toBe('Pádel'));

    await userEvent.click(screen.getByRole('button', { name: 'Todos' }));
    await waitFor(() => {
      expect(ultimoPedido().has('q')).toBe(false);
      expect(ultimoPedido().has('modalidad')).toBe(false);
    });
    expect(screen.getByPlaceholderText(/buscar por torneo/i)).toHaveValue('');
  });
});
