import { afterEach, describe, expect, it, vi } from 'vitest';
import { http } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import { equipoApi } from '../api/equipoApi';
import { inscripcionApi } from '../api/inscripcionApi';
import { torneoApi } from '../api/torneoApi';
import { problema } from '../mocks/adminHandlers';
import { server } from '../mocks/server';
import { renderRuta } from '../test/renderRuta';

const ENTRADA_F5 = '/torneos/torneo-apertura-f5/inscripcion';

// Jugadores de los mocks (ids de inscripcionesHandlers.ts) para completar una nómina.
const JUGADORES = [101, 102, 103, 104];

/** Un borrador de Los Galácticos en el torneo `slug`; con `confirmada`, queda PENDIENTE_PAGO. */
const inscripcionDeLosGalacticos =
  (slug: string, confirmada: boolean) => async () => {
    const torneo = await torneoApi.obtenerPorSlug(slug);
    const equipos = await equipoApi.listarMios();
    const galacticos = equipos.content.find((e) => e.nombre === 'Los Galácticos')!;
    const borrador = await inscripcionApi.crear(torneo.id, {
      equipoId: galacticos.id,
      nomina: JUGADORES.slice(0, (torneo.tamanioEquipo ?? 3) - 1),
    });
    if (confirmada) await inscripcionApi.confirmar(borrador.id, true);
  };

// Los mocks numeran las inscripciones nuevas desde 1000 y se reinician entre test y test.
const ID = 1000;

describe('entrada a la inscripción', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('con una inscripción pendiente de pago, lleva al paso 2', async () => {
    const { ubicacion } = await renderRuta(ENTRADA_F5, {
      prepara: inscripcionDeLosGalacticos('torneo-apertura-f5', true),
    });

    await waitFor(() => expect(ubicacion()).toBe(`/inscripciones/${ID}/pago`));
  });

  it('con un borrador, lleva al paso 1 con ese borrador', async () => {
    const { ubicacion } = await renderRuta(ENTRADA_F5, {
      prepara: inscripcionDeLosGalacticos('torneo-apertura-f5', false),
    });

    await waitFor(() => expect(ubicacion()).toBe(`/inscripciones/${ID}/nomina`));
    expect(await screen.findByLabelText('Equipo')).toHaveDisplayValue('Los Galácticos');
  });

  it('con una inscripción confirmada, avisa que ya está inscripto y no muestra el formulario', async () => {
    const { ubicacion } = await renderRuta('/torneos/torneo-gratis/inscripcion', {
      prepara: inscripcionDeLosGalacticos('torneo-gratis', true), // gratis: confirmar la deja CONFIRMADA
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('Ya estás inscripto en este torneo');
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Ver mi inscripción' })).toHaveAttribute(
      'href',
      `/inscripciones/${ID}/pago`
    );
    expect(screen.queryByLabelText('Equipo')).not.toBeInTheDocument();
    expect(ubicacion()).toBe('/torneos/torneo-gratis/inscripcion');
  });

  it('si solo hay una cancelada, abre el alta y deja ese equipo deshabilitado', async () => {
    // En los mocks, Los Halcones ya tienen una inscripción CANCELADA en torneo-apertura-f5.
    const { ubicacion } = await renderRuta(ENTRADA_F5);

    expect(await screen.findByLabelText('Equipo')).toBeEnabled();
    expect(screen.getByRole('option', { name: /Los Halcones/ })).toBeDisabled();
    expect(screen.getByRole('option', { name: 'Los Galácticos' })).toBeEnabled();
    expect(ubicacion()).toBe(ENTRADA_F5);
  });

  it('con un torneo inexistente avisa en la página y no muestra el formulario', async () => {
    await renderRuta('/torneos/no-existe/inscripcion');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El torneo no existe o ya no está disponible'
    );
    expect(screen.queryByLabelText('Equipo')).not.toBeInTheDocument();
  });

  it('con la inscripción cerrada avisa en la página y no muestra el formulario', async () => {
    await renderRuta('/torneos/torneo-cerrado/inscripcion');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La inscripción a Torneo Clausura 2025 no está abierta o ya cerró'
    );
    expect(screen.queryByLabelText('Equipo')).not.toBeInTheDocument();
  });

  it('si la inscripción cerró mientras tanto, avisa aunque haya una pendiente de pago', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-25T12:00:00Z'));
    const { ubicacion } = await renderRuta(ENTRADA_F5, {
      prepara: async () => {
        await inscripcionDeLosGalacticos('torneo-apertura-f5', true)();
        vi.setSystemTime(new Date('2031-01-02T12:00:00Z')); // pasó el cierre (2030-12-31)
      },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('no está abierta o ya cerró');
    expect(ubicacion()).toBe(ENTRADA_F5);
  });

  it('si la cuenta está bloqueada lo explica en la página y no muestra el formulario', async () => {
    server.use(
      http.get('*/inscripciones/mias', () =>
        problema(403, 'USUARIO_BLOQUEADO', 'La cuenta tiene un bloqueo vigente')
      )
    );
    await renderRuta(ENTRADA_F5);

    expect(await screen.findByRole('alert')).toHaveTextContent('Tu cuenta, o la de un jugador de la nómina, tiene un bloqueo vigente');
    expect(screen.queryByLabelText('Equipo')).not.toBeInTheDocument();
  });

  it('si falla la carga de las inscripciones lo avisa en la página y no muestra el formulario', async () => {
    server.use(
      http.get('*/inscripciones/mias', () => problema(500, 'ERROR_INTERNO', 'Falló algo'))
    );
    await renderRuta(ENTRADA_F5);

    expect(await screen.findByRole('alert')).toHaveTextContent('Algo falló en el servidor');
    expect(screen.queryByLabelText('Equipo')).not.toBeInTheDocument();
  });
});
