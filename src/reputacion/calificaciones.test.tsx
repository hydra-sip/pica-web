import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { CalificacionRequest } from '../api/calificacionApi';
import { InscripcionDelTorneo } from '../api/torneoApi';
import { prepararTorneoACancelar, TORNEO_A_CANCELAR } from '../mocks/cancelacionHandlers';
import { server } from '../mocks/server';
import { renderRuta } from '../test/renderRuta';
import { InscripcionesDelTorneo } from '../torneos/components/InscripcionesDelTorneo';
import { CalificarJugadores } from './components/CalificarJugadores';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const juan = { id: 2, username: 'usuario', nombres: 'Juan', apellidos: 'Pérez' };

const inscripcion = (cambios: Partial<InscripcionDelTorneo>): InscripcionDelTorneo => ({
  id: 1,
  estado: 'CONFIRMADA',
  creadoEn: '2026-11-01T12:00:00Z',
  usuario: juan,
  equipo: null,
  capitan: null,
  jugadores: null,
  fairPlay: 100,
  reputacion: { promedio: null, cantidad: 0 },
  noConfiable: false,
  ...cambios,
});

/** Lo que se mandó al calificar, sin cambiar la respuesta del mock. */
const espiarCalificacion = () => {
  const enviados: CalificacionRequest[] = [];
  server.events.on('request:start', async ({ request }) => {
    if (request.method === 'POST' && request.url.endsWith('/calificaciones')) {
      enviados.push((await request.clone().json()) as CalificacionRequest);
    }
  });
  return enviados;
};

const calificar = () => {
  render(
    <MemoryRouter>
      <CalificarJugadores torneoId={7} />
    </MemoryRouter>
  );
  return userEvent.setup();
};

const fila = async (nombre: string) =>
  (await screen.findByText(nombre)).closest('li') as HTMLElement;

describe('HU-805: calificar a los jugadores del torneo terminado', () => {
  afterEach(() => server.events.removeAllListeners());

  it('una calificación válida queda registrada y la fila pasa a solo lectura', async () => {
    const enviados = espiarCalificacion();
    const user = calificar();
    const juanPerez = await fila('Juan Pérez');

    await user.click(within(juanPerez).getByRole('radio', { name: '4 estrellas' }));
    await user.type(
      within(juanPerez).getByLabelText(/Comentario/),
      '  Llegó tarde a dos partidos  '
    );
    await user.click(within(juanPerez).getByLabelText('No confiable'));
    await user.click(within(juanPerez).getByRole('button', { name: 'Calificar a Juan Pérez' }));

    expect(await within(juanPerez).findByLabelText('4 de 5 estrellas')).toBeInTheDocument();
    expect(within(juanPerez).getByText('«Llegó tarde a dos partidos»')).toBeInTheDocument();
    expect(within(juanPerez).getByText('No confiable')).toBeInTheDocument();
    expect(within(juanPerez).queryByRole('button', { name: /Calificar/ })).not.toBeInTheDocument();
    expect(enviados).toEqual([
      { usuarioId: 2, puntaje: 4, comentario: 'Llegó tarde a dos partidos', noConfiable: true },
    ]);
    // los demás siguen para calificar
    expect(screen.getByRole('button', { name: 'Calificar a Ramón Díaz' })).toBeInTheDocument();
  });

  it('calificar dos veces al mismo jugador indica el error', async () => {
    // otra pestaña ya lo calificó: la lista todavía lo muestra sin calificar
    server.use(
      http.post(`${API_URL}/torneos/7/calificaciones`, () =>
        HttpResponse.json(
          { status: 409, codigo: 'JUGADOR_YA_CALIFICADO', detail: 'Ya está calificado' },
          { status: 409 }
        )
      )
    );
    const user = calificar();
    const juanPerez = await fila('Juan Pérez');

    await user.click(within(juanPerez).getByRole('radio', { name: '5 estrellas' }));
    await user.click(within(juanPerez).getByRole('button', { name: 'Calificar a Juan Pérez' }));

    expect(await within(juanPerez).findByRole('alert')).toHaveTextContent(
      'Ya calificaste a este jugador en este torneo.'
    );
  });

  it('sin estrellas indica el error y no manda nada', async () => {
    const enviados = espiarCalificacion();
    const user = calificar();
    const juanPerez = await fila('Juan Pérez');

    await user.click(within(juanPerez).getByRole('button', { name: 'Calificar a Juan Pérez' }));

    expect(within(juanPerez).getByRole('alert')).toHaveTextContent('Elegí de 1 a 5 estrellas.');
    expect(enviados).toEqual([]);
  });

  it('los ya calificados se muestran con su calificación', async () => {
    server.use(
      http.get(`${API_URL}/torneos/7/calificaciones`, () =>
        HttpResponse.json([
          {
            inscripcionId: 1,
            equipo: null,
            jugador: juan,
            calificacion: {
              id: 9,
              torneoId: 7,
              torneo: 'Apertura F5',
              jugador: juan,
              organizador: { id: 3, username: 'organizador', nombres: 'Olga', apellidos: 'O' },
              puntaje: 3,
              comentario: null,
              noConfiable: false,
              creadaEn: '2026-11-15T18:00:00Z',
            },
          },
        ])
      )
    );
    calificar();
    const juanPerez = await fila('Juan Pérez');

    expect(within(juanPerez).getByLabelText('3 de 5 estrellas')).toBeInTheDocument();
    expect(within(juanPerez).queryByText('No confiable')).not.toBeInTheDocument();
    expect(within(juanPerez).queryByRole('radiogroup')).not.toBeInTheDocument();
  });
});

describe('HU-805: la tarjeta en la consola del torneo', () => {
  const consola = async (estado: 'FINALIZADO' | 'CANCELADO' | 'EN_CURSO') => {
    prepararTorneoACancelar(estado);
    server.use(
      http.get(`${API_URL}/torneos/opciones`, () =>
        HttpResponse.json({ checkinDuracionMaxMin: 60 })
      ),
      http.get(`${API_URL}/rifas/mis-rifas`, () =>
        HttpResponse.json({
          content: [],
          page: { size: 100, number: 0, totalElements: 0, totalPages: 0 },
        })
      )
    );
    await renderRuta(`/torneos/${TORNEO_A_CANCELAR}/consola`, { usuario: 'organizador' });
  };

  it.each(['FINALIZADO', 'CANCELADO'] as const)('con el torneo %s se califica', async (estado) => {
    await consola(estado);

    expect(await screen.findByRole('heading', { name: 'Calificar jugadores' })).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: 'Calificar a Juan Pérez' })
    ).toBeInTheDocument();
  });

  it('con el torneo en curso no aparece', async () => {
    await consola('EN_CURSO');

    expect(await screen.findByRole('heading', { name: 'Inscripciones' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Calificar jugadores' })).not.toBeInTheDocument();
  });
});

describe('HU-805: reputación y marca en la lista de inscripciones', () => {
  it('muestra el puntaje junto al fair play y la marca no confiable, que no bloquea', async () => {
    server.use(
      http.get(`${API_URL}/torneos/7/inscripciones`, () =>
        HttpResponse.json({
          content: [
            inscripcion({ reputacion: { promedio: 2.5, cantidad: 2 }, noConfiable: true }),
            inscripcion({
              id: 2,
              usuario: { id: 9, username: 'ana', nombres: 'Ana', apellidos: 'Gómez' },
            }),
          ],
          page: { size: 20, number: 0, totalElements: 2, totalPages: 1 },
        })
      )
    );
    render(
      <MemoryRouter>
        <InscripcionesDelTorneo torneoId={7} recarga={0} puedeSancionar />
      </MemoryRouter>
    );

    const juanPerez = (await screen.findByText('Juan Pérez')).closest('tr') as HTMLElement;
    expect(within(juanPerez).getByText('No confiable')).toBeInTheDocument();
    expect(within(juanPerez).getByText('2.5 / 5 ★')).toBeInTheDocument();
    expect(within(juanPerez).getByText('2 calificaciones')).toBeInTheDocument();
    expect(within(juanPerez).getByLabelText('Fair play 100, alto')).toBeInTheDocument();
    // sigue confirmado y se lo puede sancionar como a cualquiera
    expect(within(juanPerez).getByText('Confirmada')).toBeInTheDocument();
    expect(
      within(juanPerez).getByRole('button', { name: 'Sancionar en la inscripción de Juan Pérez' })
    ).toBeInTheDocument();

    const ana = screen.getByText('Ana Gómez').closest('tr') as HTMLElement;
    expect(within(ana).queryByText('No confiable')).not.toBeInTheDocument();
    expect(within(ana).getByText('Sin calificaciones')).toBeInTheDocument();
  });
});
