import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PartidoDetalle } from '../api/partidoApi';
import { SancionDetalle } from '../api/sancionApi';
import { InscripcionDelTorneo } from '../api/torneoApi';
import { server } from '../mocks/server';
import { PartidoPage } from '../partidos/pages/PartidoPage';
import { InscripcionesDelTorneo } from '../torneos/components/InscripcionesDelTorneo';
import { MisSanciones } from './components/MisSanciones';
import { SancionesDelTorneo } from './components/SancionesDelTorneo';

vi.mock('../realtime/useTorneoRealtime', () => ({ useTorneoRealtime: () => undefined }));

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const juan = { id: 2, username: 'usuario', nombres: 'Juan', apellidos: 'Pérez' };
const olga = { id: 3, username: 'organizador', nombres: 'Olga', apellidos: 'Organizadora' };

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

const sancion = (cambios: Partial<SancionDetalle> = {}): SancionDetalle => ({
  id: 1,
  torneoId: 7,
  torneo: 'Apertura F5',
  jugador: juan,
  partidoId: null,
  gravedad: 'MEDIA',
  motivo: 'Juego brusco',
  aplicadaPor: olga,
  aplicadaEn: '2026-11-15T18:00:00Z',
  anuladaEn: null,
  ...cambios,
});

/** La lista de inscriptos del torneo 7: un individual, un equipo y una pendiente de pago. */
const conInscriptos = () =>
  server.use(
    http.get(`${API_URL}/torneos/7/inscripciones`, () =>
      HttpResponse.json({
        content: [
          inscripcion({}),
          inscripcion({
            id: 2,
            usuario: null,
            equipo: { id: 5, nombre: 'Los Rudos' },
            capitan: { id: 20, username: 'rudo1', nombres: 'Ramón', apellidos: 'Díaz' },
            jugadores: 2,
          }),
          inscripcion({
            id: 3,
            estado: 'PENDIENTE_PAGO',
            usuario: { ...juan, id: 9, nombres: 'Ana' },
          }),
        ],
        page: { size: 20, number: 0, totalElements: 3, totalPages: 1 },
      })
    )
  );

/** Lo que se mandó al sancionar; con `error`, el back lo rechaza. */
const alSancionar = (error?: { status: number; codigo: string }) => {
  const enviado: { body?: unknown; query?: string | null } = {};
  server.use(
    http.get(`${API_URL}/torneos/7/sanciones/jugadores`, ({ request }) => {
      enviado.query = new URL(request.url).searchParams.get('partidoId');
      return HttpResponse.json([
        { inscripcionId: 1, equipo: null, jugador: juan },
        {
          inscripcionId: 2,
          equipo: 'Los Rudos',
          jugador: { id: 20, username: 'rudo1', nombres: 'Ramón', apellidos: 'Díaz' },
        },
        {
          inscripcionId: 2,
          equipo: 'Los Rudos',
          jugador: { id: 21, username: 'rudo2', nombres: 'Rita', apellidos: 'Sosa' },
        },
      ]);
    }),
    http.post(`${API_URL}/torneos/7/sanciones`, async ({ request }) => {
      enviado.body = await request.json();
      if (error) {
        return HttpResponse.json(
          { status: error.status, codigo: error.codigo, detail: 'no' },
          { status: error.status }
        );
      }
      return HttpResponse.json(
        sancion({ jugador: { id: 21, username: 'rudo2', nombres: 'Rita', apellidos: 'Sosa' } }),
        { status: 201 }
      );
    })
  );
  return enviado;
};

const consola = (onSancionada = vi.fn()) => {
  render(
    <MemoryRouter>
      <InscripcionesDelTorneo torneoId={7} recarga={0} puedeSancionar onSancionada={onSancionada} />
    </MemoryRouter>
  );
  return { user: userEvent.setup(), onSancionada };
};

describe('HU-803: sancionar desde la lista de inscriptos', () => {
  it('en un equipo se elige a uno de la nómina y la sanción queda aplicada', async () => {
    conInscriptos();
    const enviado = alSancionar();
    const { user, onSancionada } = consola();

    expect(
      await screen.findByRole('button', { name: 'Sancionar en la inscripción de Juan Pérez' })
    ).toBeInTheDocument();
    // la pendiente de pago no juega: no se la puede sancionar
    expect(screen.queryByRole('button', { name: /inscripción de Ana/ })).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Sancionar en la inscripción de Los Rudos' })
    );
    const modal = await screen.findByRole('dialog', { name: 'Sancionar a un jugador' });
    const jugador = await within(modal).findByLabelText(/Jugador/);
    const opciones = within(jugador)
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(opciones).toEqual([
      'Elegí al jugador',
      'Ramón Díaz (@rudo1) · Los Rudos',
      'Rita Sosa (@rudo2) · Los Rudos',
    ]);

    await user.selectOptions(jugador, '21');
    await user.selectOptions(within(modal).getByLabelText(/Gravedad/), 'GRAVE');
    await user.type(within(modal).getByLabelText(/Motivo/), '  Agredió a un rival  ');
    await user.click(within(modal).getByRole('button', { name: 'Aplicar sanción' }));

    expect(await screen.findByText('Sanción aplicada a Rita Sosa.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(enviado.body).toEqual({
      usuarioId: 21,
      partidoId: null,
      gravedad: 'GRAVE',
      motivo: 'Agredió a un rival',
    });
    expect(enviado.query).toBeNull();
    expect(onSancionada).toHaveBeenCalledOnce();
  });

  it('sin motivo indica el error y no manda nada', async () => {
    conInscriptos();
    const enviado = alSancionar();
    const { user } = consola();

    await user.click(
      await screen.findByRole('button', { name: 'Sancionar en la inscripción de Juan Pérez' })
    );
    const modal = await screen.findByRole('dialog');
    // un solo jugador: ya viene elegido
    await waitFor(() => expect(within(modal).getByLabelText(/Jugador/)).toHaveValue('2'));
    await user.selectOptions(within(modal).getByLabelText(/Gravedad/), 'LEVE');
    await user.type(within(modal).getByLabelText(/Motivo/), '   ');
    await user.click(within(modal).getByRole('button', { name: 'Aplicar sanción' }));

    expect(await within(modal).findByText('El motivo es obligatorio.')).toBeInTheDocument();
    expect(enviado.body).toBeUndefined();
  });

  it.each([
    [409, 'JUGADOR_NO_PARTICIPA', 'Ese jugador no está en una inscripción confirmada del torneo.'],
    [403, 'SIN_PERMISO', 'No tenés permiso para hacer esto.'],
  ])(
    'si el back responde %i %s lo avisa y el modal sigue abierto',
    async (status, codigo, texto) => {
      conInscriptos();
      alSancionar({ status, codigo });
      const { user, onSancionada } = consola();

      await user.click(
        await screen.findByRole('button', { name: 'Sancionar en la inscripción de Juan Pérez' })
      );
      const modal = await screen.findByRole('dialog');
      await waitFor(() => expect(within(modal).getByLabelText(/Jugador/)).toHaveValue('2'));
      await user.selectOptions(within(modal).getByLabelText(/Gravedad/), 'MEDIA');
      await user.type(within(modal).getByLabelText(/Motivo/), 'Insultó al árbitro');
      await user.click(within(modal).getByRole('button', { name: 'Aplicar sanción' }));

      expect(await within(modal).findByRole('alert')).toHaveTextContent(texto);
      expect(onSancionada).not.toHaveBeenCalled();
    }
  );
});

describe('HU-803: sanciones del torneo y propias', () => {
  it('la consola lista las del torneo con el link al partido', async () => {
    server.use(
      http.get(`${API_URL}/torneos/7/sanciones`, () =>
        HttpResponse.json([sancion({ id: 2, gravedad: 'GRAVE', partidoId: 40 }), sancion()])
      )
    );
    render(
      <MemoryRouter>
        <SancionesDelTorneo torneoId={7} recarga={0} />
      </MemoryRouter>
    );

    const filas = within(
      await screen.findByRole('table', { name: 'Sanciones del torneo' })
    ).getAllByRole('row');
    expect(filas).toHaveLength(3);
    expect(filas[1]).toHaveTextContent('Juan Pérez');
    expect(filas[1]).toHaveTextContent('Grave');
    expect(within(filas[1]).getByRole('link', { name: 'Ver el partido' })).toHaveAttribute(
      'href',
      '/partidos/40'
    );
    expect(filas[2]).toHaveTextContent('Media');
    expect(filas[2]).toHaveTextContent('Olga Organizadora');
  });

  it('sin sanciones dice cómo se sanciona', async () => {
    render(
      <MemoryRouter>
        <SancionesDelTorneo torneoId={7} recarga={0} />
      </MemoryRouter>
    );

    expect(await screen.findByText(/Nadie fue sancionado/)).toBeInTheDocument();
  });

  it('en Mi perfil el jugador ve las que recibió', async () => {
    server.use(
      http.get(`${API_URL}/sanciones/mias`, () =>
        HttpResponse.json([sancion({ motivo: 'Demoró el partido' })])
      )
    );
    render(
      <MemoryRouter>
        <MisSanciones />
      </MemoryRouter>
    );

    const tarjeta = await screen.findByRole('region', { name: 'Mis sanciones' });
    expect(await within(tarjeta).findByText('Demoró el partido')).toBeInTheDocument();
    expect(tarjeta).toHaveTextContent('Media');
    expect(tarjeta).toHaveTextContent('Apertura F5');
    expect(tarjeta).toHaveTextContent('Aplicada por Olga Organizadora');
  });
});

describe('HU-803: sancionar desde la ficha del partido', () => {
  const partido = (puedoSancionar: boolean): PartidoDetalle => ({
    id: 40,
    torneoId: 7,
    torneo: 'Apertura F5',
    torneoSlug: 'apertura-f5',
    ronda: 1,
    nombreRonda: 'Semifinal',
    fase: 'ELIMINACION',
    posicion: 1,
    estado: 'CONFIRMADO',
    bye: false,
    local: { inscripcionId: 1, nombre: 'Juan Pérez', puntaje: 2, penales: null, ganador: true },
    visitante: { inscripcionId: 2, nombre: 'Los Rudos', puntaje: 1, penales: null, ganador: false },
    cancha: null,
    fechaProgramada: null,
    arbitro: 'Mario Gómez',
    cargadoPor: 'LOCAL',
    resultadoCargadoEn: '2026-11-15T18:00:00Z',
    objecionVenceEn: null,
    miLado: null,
    objecion: null,
    puedoResolver: false,
    puedoSancionar,
  });

  const ficha = (puedoSancionar: boolean) => {
    server.use(
      http.get(`${API_URL}/partidos/40`, () => HttpResponse.json(partido(puedoSancionar))),
      http.get(`${API_URL}/partidos/40/evidencias`, () => HttpResponse.json([]))
    );
    render(
      <MemoryRouter initialEntries={['/partidos/40']}>
        <Routes>
          <Route path="/partidos/:id" element={<PartidoPage />} />
        </Routes>
      </MemoryRouter>
    );
    return userEvent.setup();
  };

  it('el árbitro sanciona a un jugador del partido y queda asociada al partido', async () => {
    const enviado = alSancionar();
    const user = ficha(true);

    await user.click(await screen.findByRole('button', { name: 'Sancionar' }));
    const modal = await screen.findByRole('dialog');
    await user.selectOptions(await within(modal).findByLabelText(/Jugador/), '21');
    await user.selectOptions(within(modal).getByLabelText(/Gravedad/), 'LEVE');
    await user.type(within(modal).getByLabelText(/Motivo/), 'Protestó cada fallo');
    await user.click(within(modal).getByRole('button', { name: 'Aplicar sanción' }));

    expect(await screen.findByText('Sanción aplicada a Rita Sosa.')).toBeInTheDocument();
    expect(enviado.query).toBe('40');
    expect(enviado.body).toEqual({
      usuarioId: 21,
      partidoId: 40,
      gravedad: 'LEVE',
      motivo: 'Protestó cada fallo',
    });
  });

  it('quien no organiza ni arbitra no ve el botón', async () => {
    ficha(false);

    expect(await screen.findByText('Resultado del partido')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sancionar' })).not.toBeInTheDocument();
  });
});
