import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { LogrosJugador } from '../api/logrosApi';
import { server } from '../mocks/server';
import { renderRuta } from '../test/renderRuta';
import { MisLogros } from './components/MisLogros';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const conLogros = (logros: Partial<LogrosJugador>) =>
  server.use(
    http.get(`${API_URL}/usuarios/2/logros`, () =>
      HttpResponse.json({ usuarioId: 2, insignias: [], rifasGanadas: [], ...logros })
    )
  );

describe('HU-804 (PICA-426): insignias y rifas ganadas en Mi perfil', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('un perfil sin logros muestra vacías las secciones de insignias y rifas ganadas', async () => {
    conLogros({});
    render(
      <MemoryRouter>
        <MisLogros usuarioId={2} />
      </MemoryRouter>
    );

    const insignias = await screen.findByRole('region', { name: 'Insignias' });
    expect(await within(insignias).findByText('Todavía no obtuviste insignias.')).toBeInTheDocument();

    const rifas = screen.getByRole('region', { name: 'Rifas ganadas' });
    expect(within(rifas).getByText('Todavía no ganaste ninguna rifa.')).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Nueva insignia obtenida' })).not.toBeInTheDocument();
  });

  it('muestra las rifas ganadas con la rifa, el torneo asociado, el puesto, el número ganador y la fecha', async () => {
    conLogros({
      rifasGanadas: [
        {
          rifaId: 12,
          rifaTitulo: 'Rifa Apertura',
          torneoId: 7,
          torneoNombre: 'Copa Apertura',
          torneoSlug: 'copa-apertura',
          puesto: 1,
          numeroGanador: 14,
          fecha: '2026-11-20T15:00:00Z',
        },
        {
          rifaId: 19,
          rifaTitulo: 'Rifa Abierta',
          torneoId: null,
          torneoNombre: null,
          torneoSlug: null,
          puesto: 2,
          numeroGanador: 33,
          fecha: '2026-11-22T15:00:00Z',
        },
      ],
    });
    render(
      <MemoryRouter>
        <MisLogros usuarioId={2} />
      </MemoryRouter>
    );

    const tabla = await screen.findByRole('table', { name: 'Rifas ganadas' });
    const [, filaTorneo, filaSuelta] = within(tabla).getAllByRole('row');

    expect(within(filaTorneo).getByRole('link', { name: 'Rifa Apertura' })).toHaveAttribute('href', '/rifas/12');
    expect(within(filaTorneo).getByRole('link', { name: 'Copa Apertura' })).toHaveAttribute(
      'href',
      '/torneos/copa-apertura'
    );
    expect(filaTorneo).toHaveTextContent('#14');
    expect(filaTorneo).toHaveTextContent('1.º premio');
    expect(filaTorneo).toHaveTextContent('20/11/2026');

    expect(within(filaSuelta).getByRole('link', { name: 'Rifa Abierta' })).toHaveAttribute('href', '/rifas/19');
    expect(filaSuelta).toHaveTextContent('Sin torneo asociado');
    expect(filaSuelta).toHaveTextContent('#33');
    expect(filaSuelta).toHaveTextContent('2.º premio');
    expect(filaSuelta).toHaveTextContent('22/11/2026');
  });

  it('muestra las insignias con su ícono, nombre y fecha, y lanza un aviso solo la primera vez que aparece', async () => {
    const user = userEvent.setup();
    conLogros({
      insignias: [
        {
          codigo: 'PRIMER_TORNEO_GANADO',
          nombre: 'Primer campeón',
          descripcion: 'Ganaste tu primer torneo en la plataforma',
          icono: 'corona',
          otorgadaEn: '2026-11-20T15:00:00Z',
        },
      ],
    });
    const { unmount } = render(
      <MemoryRouter>
        <MisLogros usuarioId={2} />
      </MemoryRouter>
    );

    const insignias = await screen.findByRole('region', { name: 'Insignias' });
    const item = await within(insignias).findByRole('listitem');
    expect(item).toHaveTextContent('Primer campeón');
    expect(item).toHaveTextContent('Ganaste tu primer torneo en la plataforma');
    expect(item).toHaveTextContent('20/11/2026');
    expect(item.querySelector('svg')).toBeInTheDocument();

    const toast = await screen.findByRole('status', { name: 'Nueva insignia obtenida' });
    expect(toast).toHaveTextContent('¡Nueva insignia: Primer campeón!');
    await user.click(within(toast).getByRole('button', { name: 'Cerrar aviso' }));
    expect(screen.queryByRole('status', { name: 'Nueva insignia obtenida' })).not.toBeInTheDocument();

    unmount();
    render(
      <MemoryRouter>
        <MisLogros usuarioId={2} />
      </MemoryRouter>
    );

    const insigniasSegunda = await screen.findByRole('region', { name: 'Insignias' });
    expect(await within(insigniasSegunda).findByText('Primer campeón')).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Nueva insignia obtenida' })).not.toBeInTheDocument();
  });

  it('Mi perfil (/mi-perfil) muestra las secciones de insignias y rifas ganadas del usuario', async () => {
    await renderRuta('/mi-perfil');

    expect(await screen.findByRole('region', { name: 'Insignias' })).toHaveTextContent(
      'Todavía no obtuviste insignias.'
    );
    expect(await screen.findByRole('region', { name: 'Rifas ganadas' })).toHaveTextContent(
      'Todavía no ganaste ninguna rifa.'
    );
  });
});
