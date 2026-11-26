import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { InscripcionDelTorneo } from '../api/torneoApi';
import { prepararTorneoACancelar, TORNEO_A_CANCELAR } from '../mocks/cancelacionHandlers';
import { JUGADOR_COMPLETO } from '../mocks/perfilJugadorHandlers';
import { server } from '../mocks/server';
import { renderRuta } from '../test/renderRuta';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

describe('HU-801: el perfil público del jugador', () => {
  it('muestra quién es, sus contadores y su fair play', async () => {
    await renderRuta('/jugadores/2');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Juan Pérez' })
    ).toBeInTheDocument();
    expect(screen.getByText('@usuario')).toBeInTheDocument();
    expect(screen.getByText('JP')).toBeInTheDocument();

    const historial = screen.getByRole('region', { name: 'Historial del jugador' });
    expect(within(historial).getByText('Torneos jugados').closest('article')).toHaveTextContent(
      '4'
    );
    expect(within(historial).getByText('Victorias').closest('article')).toHaveTextContent('9');
    expect(within(historial).getByText('Derrotas').closest('article')).toHaveTextContent('3');
    expect(within(historial).getByText('Podios').closest('article')).toHaveTextContent('2');

    const fairPlay = screen.getByRole('region', { name: 'Fair play' });
    expect(within(fairPlay).getByLabelText('Fair play 72, medio')).toHaveTextContent('72');
    expect(
      within(fairPlay).getByRole('button', { name: 'Cómo se calcula el fair play' })
    ).toBeInTheDocument();
    expect(fairPlay).toHaveTextContent('Actualizado el 15/11/2026');
  });

  it('abre sin sesión, y un índice que nunca se movió no muestra fecha', async () => {
    await renderRuta('/jugadores/30', { usuario: 'anonimo' });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Nadia Nueva' })
    ).toBeInTheDocument();
    const fairPlay = screen.getByRole('region', { name: 'Fair play' });
    expect(within(fairPlay).getByLabelText('Fair play 100, alto')).toBeInTheDocument();
    expect(fairPlay).not.toHaveTextContent('Actualizado');
  });

  it('un jugador que no existe lo dice y lleva a los torneos', async () => {
    await renderRuta('/jugadores/999');

    expect(
      await screen.findByRole('heading', { name: 'Este jugador no existe' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver los torneos' })).toHaveAttribute(
      'href',
      '/torneos'
    );
  });

  it('un id que no es un número muestra lo mismo, sin preguntarle al back', async () => {
    const pedidos: string[] = [];
    server.events.on('request:start', ({ request }) => {
      if (request.url.includes('/perfil')) pedidos.push(request.url);
    });
    await renderRuta('/jugadores/juan');

    expect(
      await screen.findByRole('heading', { name: 'Este jugador no existe' })
    ).toBeInTheDocument();
    expect(pedidos).toEqual([]);
    server.events.removeAllListeners();
  });

  it('otro error se distingue de un jugador inexistente', async () => {
    server.use(
      http.get(`${API_URL}/usuarios/2/perfil`, () =>
        HttpResponse.json(
          { status: 500, codigo: 'ERROR_INTERNO', detail: 'Falló' },
          { status: 500, headers: { 'Content-Type': 'application/problem+json' } }
        )
      )
    );
    await renderRuta('/jugadores/2');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Algo falló en el servidor. Probá de nuevo en un rato.'
    );
    expect(screen.queryByText('Este jugador no existe')).not.toBeInTheDocument();
  });

  it('mientras carga lo avisa', async () => {
    await renderRuta('/jugadores/2');

    expect(screen.getByRole('status')).toHaveTextContent('Cargando el perfil del jugador...');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Juan Pérez' })
    ).toBeInTheDocument();
  });
});

describe('HU-801: se llega al perfil desde las inscripciones del organizador', () => {
  const inscripcion = (cambios: Partial<InscripcionDelTorneo>): InscripcionDelTorneo => ({
    id: 1,
    estado: 'CONFIRMADA',
    creadoEn: '2026-11-01T12:00:00Z',
    usuario: null,
    equipo: null,
    capitan: null,
    jugadores: null,
    fairPlay: 100,
    reputacion: { promedio: null, cantidad: 0 },
    noConfiable: false,
    ...cambios,
  });

  it('el nombre del inscripto individual y el @capitán de un equipo llevan a su perfil', async () => {
    prepararTorneoACancelar('INSCRIPCION_ABIERTA');
    server.use(
      http.get(`${API_URL}/torneos/opciones`, () =>
        HttpResponse.json({ checkinDuracionMaxMin: 60 })
      ),
      http.get(`${API_URL}/rifas/mis-rifas`, () =>
        HttpResponse.json({
          content: [],
          page: { size: 100, number: 0, totalElements: 0, totalPages: 0 },
        })
      ),
      http.get(`${API_URL}/torneos/${TORNEO_A_CANCELAR}/inscripciones`, () =>
        HttpResponse.json({
          content: [
            inscripcion({
              id: 1,
              usuario: { id: 2, username: 'usuario', nombres: 'Juan', apellidos: 'Pérez' },
            }),
            inscripcion({
              id: 2,
              equipo: { id: 9, nombre: 'Los Rudos' },
              capitan: { id: 20, username: 'rudo1', nombres: 'Ramón', apellidos: 'Díaz' },
              jugadores: 5,
            }),
          ],
          page: { size: 20, number: 0, totalElements: 2, totalPages: 1 },
        })
      )
    );
    const { user, ubicacion } = await renderRuta(`/torneos/${TORNEO_A_CANCELAR}/consola`, {
      usuario: 'organizador',
    });

    const tabla = await screen.findByRole('table', { name: 'Inscripciones del torneo' });
    expect(within(tabla).getByRole('link', { name: 'Juan Pérez' })).toHaveAttribute(
      'href',
      '/jugadores/2'
    );
    expect(within(tabla).getByRole('link', { name: '@rudo1' })).toHaveAttribute(
      'href',
      '/jugadores/20'
    );
    expect(within(tabla).queryByRole('link', { name: 'Los Rudos' })).not.toBeInTheDocument();

    await user.click(within(tabla).getByRole('link', { name: 'Juan Pérez' }));
    expect(ubicacion()).toBe('/jugadores/2');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Juan Pérez' })
    ).toBeInTheDocument();
  });
});

describe('HU-801: los últimos torneos del jugador', () => {
  it('cada torneo muestra a dónde llegó, con qué equipo y lleva a su ficha', async () => {
    await renderRuta('/jugadores/2', { usuario: 'anonimo' });

    const seccion = await screen.findByRole('region', { name: 'Últimos torneos' });
    const [apertura, padel] = within(seccion).getAllByRole('listitem');
    expect(within(apertura).getByRole('link', { name: 'Apertura F5' })).toHaveAttribute(
      'href',
      '/torneos/apertura-f5'
    );
    expect(apertura).toHaveTextContent('Fútbol 5 · 20/11/2026');
    expect(apertura).toHaveTextContent('1.º puesto');
    expect(apertura).toHaveTextContent('con Los Rudos');

    expect(padel).toHaveTextContent('Fase de grupos');
    expect(padel).not.toHaveTextContent('puesto');
    expect(padel).not.toHaveTextContent('con ');
  });

  it('un torneo sin ficha pública se muestra sin enlace', async () => {
    server.use(
      http.get(`${API_URL}/usuarios/2/perfil`, () =>
        HttpResponse.json({
          ...JUGADOR_COMPLETO,
          ultimosTorneos: [{ ...JUGADOR_COMPLETO.ultimosTorneos[0], slug: null }],
        })
      )
    );
    await renderRuta('/jugadores/2');

    const seccion = await screen.findByRole('region', { name: 'Últimos torneos' });
    expect(within(seccion).getByText('Apertura F5')).toBeInTheDocument();
    expect(within(seccion).queryByRole('link')).not.toBeInTheDocument();
  });

  it('un jugador que no terminó ninguno lo dice', async () => {
    await renderRuta('/jugadores/30');

    expect(await screen.findByRole('region', { name: 'Últimos torneos' })).toHaveTextContent(
      'Todavía no terminó ningún torneo'
    );
  });
});
