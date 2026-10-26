import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { equipoApi } from '../api/equipoApi';
import { inscripcionApi } from '../api/inscripcionApi';
import { torneoApi } from '../api/torneoApi';
import { renderRuta } from '../test/renderRuta';

// Los mocks numeran las inscripciones nuevas desde 1000 y se reinician entre test y test: la
// primera que arma `prepara` es siempre esta.
const ID = 1000;
const RUTA = `/inscripciones/${ID}`;

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
