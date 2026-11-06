import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { InscripcionDetalle } from '../api/inscripcionApi';
import { server } from '../mocks/server';
import { renderRuta } from '../test/renderRuta';

// El participante de renderRuta es el usuario 2; el capitán de este equipo es otro (110).
const YO = 2;
const CAPITAN = 110;

const nominaDe = (ids: number[]) =>
  ids.map((id) => ({ id, username: `u${id}`, nombres: `Jugador${id}`, apellidos: 'Test' }));

/** Los Rivales confirmados en el Torneo Apertura F5 de los mocks, que tiene la inscripción abierta y cupo. */
const deEquipo = (cambios: Partial<InscripcionDetalle>): InscripcionDetalle => ({
  id: 900,
  torneoId: 1,
  torneo: {
    id: 1,
    nombre: 'Torneo Apertura F5',
    slug: 'torneo-apertura-f5',
    estado: 'INSCRIPCION_ABIERTA',
  },
  usuarioId: null,
  estado: 'CONFIRMADA',
  reglamentoAceptadoEn: '2026-11-01T12:00:00Z',
  creadoEn: '2026-11-01T12:00:00Z',
  modificadoEn: '2026-11-01T12:00:00Z',
  equipo: { id: 10, nombre: 'Los Rivales', capitanId: CAPITAN },
  nomina: nominaDe([YO, CAPITAN, 105]),
  rol: 'JUGADOR',
  ...cambios,
});

/** GET /inscripciones/:id responde este detalle, con el rol de quien mira (HU-209). */
const conDetalle = (detalle: InscripcionDetalle) =>
  server.use(
    http.get('*/inscripciones/:id', ({ params }) =>
      Number(params.id) === detalle.id ? HttpResponse.json(detalle) : undefined
    )
  );

const filaDe = async (nombre: string) =>
  (
    await within(await screen.findByRole('list', { name: 'Nómina' })).findByText(new RegExp(nombre))
  ).closest('li') as HTMLElement;

describe('Mi inscripción según el rol de quien mira (HU-209)', () => {
  it('un jugador de la nómina la ve en solo lectura, con el capitán real marcado', async () => {
    conDetalle(deEquipo({}));

    await renderRuta('/inscripciones/900');

    expect(await filaDe(`Jugador${CAPITAN}`)).toHaveTextContent('(Capitán)');
    expect(await filaDe(`Jugador${YO}`)).not.toHaveTextContent('(Capitán)');
    expect(screen.queryByRole('button', { name: /Reemplazar/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/la nómina quedó fija/)).not.toBeInTheDocument();
  });

  it('el capitán sigue pudiendo reemplazar', async () => {
    conDetalle(
      deEquipo({
        rol: 'CAPITAN',
        equipo: { id: 10, nombre: 'Los Rivales', capitanId: YO },
        nomina: nominaDe([YO, 105]),
      })
    );

    await renderRuta('/inscripciones/900');

    expect(
      await screen.findByRole('button', { name: /Reemplazar a Jugador105/ })
    ).toBeInTheDocument();
  });

  it('el organizador ve una pendiente de pago en solo lectura, sin que lo lleve a pagarla', async () => {
    conDetalle(deEquipo({ rol: 'ORGANIZADOR', estado: 'PENDIENTE_PAGO' }));

    const { ubicacion } = await renderRuta('/inscripciones/900');

    expect(await filaDe(`Jugador${CAPITAN}`)).toHaveTextContent('(Capitán)');
    expect(ubicacion()).toBe('/inscripciones/900');
    expect(screen.queryByRole('button', { name: /Reemplazar/ })).not.toBeInTheDocument();
  });

  it('el organizador ve una individual sin el nombre de otro como participante', async () => {
    conDetalle(deEquipo({ rol: 'ORGANIZADOR', usuarioId: 7, equipo: null, nomina: null }));

    await renderRuta('/inscripciones/900');

    expect(await screen.findByText('Inscripción individual')).toBeInTheDocument();
    expect(screen.queryByText(/Participante:/)).not.toBeInTheDocument();
  });
});
