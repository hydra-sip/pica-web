import { describe, expect, it } from 'vitest';
import { http } from 'msw';
import { screen, waitFor, within } from '@testing-library/react';
import { equipoApi } from '../api/equipoApi';
import { inscripcionApi } from '../api/inscripcionApi';
import { torneoApi } from '../api/torneoApi';
import { problema } from '../mocks/adminHandlers';
import { server } from '../mocks/server';
import { renderRuta } from '../test/renderRuta';

// Los mocks numeran las inscripciones nuevas desde 1000 y se reinician entre test y test: la
// primera que arma `prepara` es siempre esta.
const ID = 1000;
const RUTA = `/inscripciones/${ID}`;

// Deportivo Luján, confirmado en la Copa de Invierno de los mocks, ya tiene dos reemplazos.
const CON_REEMPLAZOS = '/inscripciones/902';

// Jugadores de los mocks (ids de inscripcionesHandlers.ts): Lucas Fernández, Matías Rossi,
// Joaquín Gómez y Salvador Báez.
const JUGADORES = [101, 102, 103, 104];

/** El borrador de Los Galácticos en el Torneo Apertura F5, con la nómina completa (5 jugadores). */
const borradorDeEquipo = async () => {
  const torneo = await torneoApi.getTorneoBySlug('torneo-apertura-f5');
  const equipos = await equipoApi.listarMios();
  const galacticos = equipos.content.find((e) => e.nombre === 'Los Galácticos')!;
  await inscripcionApi.crear(torneo.id, { equipoId: galacticos.id, nomina: JUGADORES });
};

/** El mismo equipo con el reglamento aceptado: PENDIENTE_PAGO. */
const equipoPendienteDePago = async () => {
  await borradorDeEquipo();
  await inscripcionApi.confirmar(ID, true);
};

/** Y ya pagado: CONFIRMADA. */
const equipoConfirmado = async () => {
  await equipoPendienteDePago();
  await inscripcionApi.pagar(ID);
};

/** Una inscripción individual pagada en el Desafío Individual de Ping Pong: CONFIRMADA. */
const individualConfirmada = async () => {
  const torneo = await torneoApi.getTorneoBySlug('individual-pago');
  await inscripcionApi.crear(torneo.id);
  await inscripcionApi.confirmar(ID, true);
  await inscripcionApi.pagar(ID);
};

describe('mi inscripción', () => {
  it('muestra el equipo, el torneo y la nómina con el capitán marcado', async () => {
    await renderRuta(RUTA, { prepara: equipoConfirmado });

    expect(await screen.findByRole('heading', { name: 'Mi inscripción' })).toBeInTheDocument();
    expect(screen.getByText(/Los Galácticos/)).toBeInTheDocument();
    expect(screen.getByText(/Torneo Apertura F5/)).toBeInTheDocument();
    const filas = within(screen.getByRole('list', { name: 'Nómina' })).getAllByRole('listitem');
    expect(filas).toHaveLength(5);
    expect(filas[0]).toHaveTextContent('Usuario PICA (Capitán)');
    expect(filas[0]).toHaveTextContent('@usuario');
    expect(filas[1]).toHaveTextContent('Lucas Fernández');
    expect(filas[1]).toHaveTextContent('@lucas_f99');
  });

  it('un borrador lleva al paso 1', async () => {
    const { ubicacion } = await renderRuta(RUTA, { prepara: borradorDeEquipo });

    await waitFor(() => expect(ubicacion()).toBe(`${RUTA}/nomina`));
  });

  it('una pendiente de pago lleva al paso 2', async () => {
    const { ubicacion } = await renderRuta(RUTA, { prepara: equipoPendienteDePago });

    await waitFor(() => expect(ubicacion()).toBe(`${RUTA}/pago`));
  });

  it('una individual confirmada muestra el participante y el torneo, sin nómina', async () => {
    await renderRuta(RUTA, { prepara: individualConfirmada });

    expect(await screen.findByRole('heading', { name: 'Mi inscripción' })).toBeInTheDocument();
    expect(screen.getByText(/Participante: Usuario PICA/)).toBeInTheDocument();
    expect(screen.getByText(/Desafío Individual de Ping Pong/)).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Nómina' })).not.toBeInTheDocument();
  });

  it('una cancelada muestra el aviso de cancelada', async () => {
    await renderRuta(RUTA, {
      prepara: async () => {
        await borradorDeEquipo();
        await inscripcionApi.cancelar(ID);
      },
    });

    expect(await screen.findByText(/Esta inscripción fue cancelada/)).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Nómina' })).not.toBeInTheDocument();
  });

  it('una que no existe muestra que no la encontramos', async () => {
    await renderRuta('/inscripciones/999');

    expect(await screen.findByRole('alert')).toHaveTextContent('No encontramos esta inscripción.');
  });
});

describe('historial de reemplazos', () => {
  it('muestra los reemplazos del más viejo al más nuevo, con quién salió, quién entró, cuándo y quién lo hizo', async () => {
    await renderRuta(CON_REEMPLAZOS);

    const historial = await screen.findByRole('list', { name: 'Historial de reemplazos' });
    const filas = within(historial).getAllByRole('listitem');
    expect(filas).toHaveLength(2);
    expect(filas[0]).toHaveTextContent(
      'Salió Lucas Fernández (@lucas_f99), entró Joaquín Gómez (@joaco_g)'
    );
    expect(filas[0]).toHaveTextContent(/21\/10\/2026 \d{2}:\d{2}/);
    expect(filas[0]).toHaveTextContent('por @usuario');
    expect(filas[1]).toHaveTextContent(
      'Salió Matías Rossi (@mrossi), entró Salvador Báez (@salva_b)'
    );
    expect(filas[1]).toHaveTextContent(/22\/10\/2026 \d{2}:\d{2}/);
  });

  it('sin reemplazos lo dice', async () => {
    await renderRuta(RUTA, { prepara: equipoConfirmado });

    expect(await screen.findByText('Todavía no hay reemplazos.')).toBeInTheDocument();
  });

  it('si el historial no carga, avisa en su sección y la nómina se sigue viendo', async () => {
    server.use(
      http.get('*/inscripciones/:id/reemplazos', () =>
        problema(500, 'ERROR_INTERNO', 'Falló algo en el servidor')
      )
    );
    await renderRuta(RUTA, { prepara: equipoConfirmado });

    expect(
      await screen.findByText('No se pudo cargar el historial de reemplazos.')
    ).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Nómina' })).toBeInTheDocument();
  });

  it('una individual no tiene historial', async () => {
    await renderRuta(RUTA, { prepara: individualConfirmada });

    await screen.findByText(/Participante: Usuario PICA/);
    expect(
      screen.queryByRole('heading', { name: 'Historial de reemplazos' })
    ).not.toBeInTheDocument();
  });
});
