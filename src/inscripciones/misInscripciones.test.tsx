import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { InscripcionResumen } from '../api/inscripcionApi';
import { server } from '../mocks/server';
import { renderRuta } from '../test/renderRuta';

const RUTA = '/mis-inscripciones';

const fila = (cambios: Partial<InscripcionResumen>): InscripcionResumen => ({
  id: 1,
  torneoId: 1,
  torneo: {
    id: 1,
    nombre: 'Copa Primavera',
    slug: 'copa-primavera',
    estado: 'INSCRIPCION_ABIERTA',
  },
  usuarioId: null,
  estado: 'CONFIRMADA',
  creadoEn: '2026-11-01T12:00:00Z',
  modificadoEn: '2026-11-01T12:00:00Z',
  equipo: { id: 10, nombre: 'Los Rivales', capitanId: 110 },
  rol: 'JUGADOR',
  ...cambios,
});

/** GET /inscripciones/mias responde estas filas, como las arma el back (HU-209). */
const conMias = (filas: InscripcionResumen[]) =>
  server.use(
    http.get('*/inscripciones/mias', () =>
      HttpResponse.json({
        content: filas,
        page: { size: 100, number: 0, totalElements: filas.length, totalPages: 1 },
      })
    )
  );

describe('Mis inscripciones (HU-209)', () => {
  it('un jugador ve el torneo del equipo ajeno en cuya nómina figura, con su rol y el enlace a la ficha', async () => {
    conMias([fila({})]);

    await renderRuta(RUTA);

    const item = await screen.findByRole('listitem', { name: /Copa Primavera/ });
    expect(within(item).getByText('Los Rivales')).toBeInTheDocument();
    expect(within(item).getByText('Jugador')).toBeInTheDocument();
    expect(within(item).getByText('Inscripción abierta')).toBeInTheDocument();
    expect(within(item).getByText('Confirmada')).toBeInTheDocument();
    expect(within(item).getByRole('link', { name: 'Ver torneo' })).toHaveAttribute(
      'href',
      '/torneos/copa-primavera'
    );
  });

  it('sin inscripciones muestra la lista vacía con un enlace al catálogo', async () => {
    conMias([]);

    await renderRuta(RUTA);

    expect(
      await screen.findByRole('heading', { name: 'Todavía no estás inscripto en ningún torneo' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explorar torneos' })).toHaveAttribute('href', '/');
  });

  it('no muestra las canceladas, y si solo hay canceladas la lista queda vacía', async () => {
    conMias([
      fila({
        id: 2,
        estado: 'CANCELADA',
        rol: 'CAPITAN',
        equipo: { id: 1, nombre: 'Los Galácticos', capitanId: 2 },
      }),
    ]);

    await renderRuta(RUTA);

    expect(
      await screen.findByRole('heading', { name: 'Todavía no estás inscripto en ningún torneo' })
    ).toBeInTheDocument();
    expect(screen.queryByText('Los Galácticos')).not.toBeInTheDocument();
  });

  it('el capitán ve las suyas, borradores incluidos, junto a las de la nómina', async () => {
    conMias([
      fila({
        id: 3,
        estado: 'BORRADOR',
        rol: 'CAPITAN',
        torneo: {
          id: 2,
          nombre: 'Copa Invierno',
          slug: 'copa-invierno',
          estado: 'INSCRIPCION_ABIERTA',
        },
        equipo: { id: 1, nombre: 'Los Galácticos', capitanId: 2 },
      }),
      fila({}),
    ]);

    await renderRuta(RUTA);

    const borrador = await screen.findByRole('listitem', { name: /Copa Invierno/ });
    expect(within(borrador).getByText('Capitán')).toBeInTheDocument();
    expect(within(borrador).getByText('Borrador')).toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: /Copa Primavera/ })).toBeInTheDocument();
  });

  it('cada fila ofrece seguir el borrador, pagar la pendiente o ver la confirmada', async () => {
    conMias([
      fila({
        id: 3,
        estado: 'BORRADOR',
        rol: 'CAPITAN',
        torneo: { id: 3, nombre: 'Copa A', slug: 'copa-a', estado: 'INSCRIPCION_ABIERTA' },
      }),
      fila({
        id: 4,
        estado: 'PENDIENTE_PAGO',
        rol: 'INDIVIDUAL',
        equipo: null,
        torneo: { id: 4, nombre: 'Copa B', slug: 'copa-b', estado: 'INSCRIPCION_ABIERTA' },
      }),
      fila({
        id: 5,
        estado: 'CONFIRMADA',
        rol: 'JUGADOR',
        torneo: { id: 5, nombre: 'Copa C', slug: 'copa-c', estado: 'EN_CURSO' },
      }),
    ]);

    await renderRuta(RUTA);

    const accion = async (torneo: string, nombre: string) =>
      within(await screen.findByRole('listitem', { name: torneo })).getByRole('link', {
        name: nombre,
      });
    expect(await accion('Copa A', 'Seguir la inscripción')).toHaveAttribute(
      'href',
      '/inscripciones/3/nomina'
    );
    expect(await accion('Copa B', 'Pagar')).toHaveAttribute('href', '/inscripciones/4/pago');
    expect(await accion('Copa C', 'Ver mi inscripción')).toHaveAttribute(
      'href',
      '/inscripciones/5'
    );
  });

  it('con sesión, la barra lateral lleva a Mis inscripciones y la barra de abajo del celular no cambia', async () => {
    conMias([]);

    await renderRuta('/');

    const [lateral, inferior] = await screen.findAllByRole('navigation', {
      name: 'Navegación principal',
    });
    expect(within(lateral).getByRole('link', { name: /Mis inscripciones/ })).toHaveAttribute(
      'href',
      '/mis-inscripciones'
    );
    expect(
      within(inferior).queryByRole('link', { name: /Mis inscripciones/ })
    ).not.toBeInTheDocument();
  });

  it('en el perfil hay un enlace a Mis inscripciones, para el celular', async () => {
    await renderRuta('/mi-perfil');

    const contenido = await screen.findByRole('main');
    expect(
      await within(contenido).findByRole('link', { name: /Mis inscripciones/ })
    ).toHaveAttribute('href', '/mis-inscripciones');
  });
});
