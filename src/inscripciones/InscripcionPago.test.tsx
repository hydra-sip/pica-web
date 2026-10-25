import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { equipoApi } from '../api/equipoApi';
import { inscripcionApi } from '../api/inscripcionApi';
import { torneoApi } from '../api/torneoApi';
import { http } from 'msw';
import { problema } from '../mocks/adminHandlers';
import { server } from '../mocks/server';
import { renderRuta } from '../test/renderRuta';

// Los mocks numeran las inscripciones nuevas desde 1000 y se reinician entre test y test: la
// primera que arma `prepara` es siempre esta.
const ID = 1000;
const RUTA_PAGO = `/inscripciones/${ID}/pago`;

// Jugadores de los mocks (ids de inscripcionesHandlers.ts) para completar una nómina.
const JUGADORES = [101, 102, 103, 104, 105];

/** Una inscripción de equipo (Los Galácticos) ya confirmada con el reglamento: PENDIENTE_PAGO. */
const pendienteDePago = (slug: string) => async () => {
  const torneo = await torneoApi.obtenerPorSlug(slug);
  const equipos = await equipoApi.listarMios();
  const galacticos = equipos.content.find((e) => e.nombre === 'Los Galácticos')!;
  const borrador = await inscripcionApi.crear(torneo.id, {
    equipoId: galacticos.id,
    nomina: JUGADORES.slice(0, (torneo.tamanioEquipo ?? 3) - 1),
  });
  await inscripcionApi.confirmar(borrador.id, true);
};

// El monto va con el espacio duro que pone Intl entre el signo y el número.
const botonPagar = (monto: string) =>
  screen.getByRole('button', {
    name: new RegExp(`^Confirmar pago de \\$\\s${monto.replace('.', '\\.')},00$`),
  });

afterEach(() => {
  vi.useRealTimers();
});

describe('paso 2: confirmar y pagar', () => {
  it('muestra el torneo, el equipo, una sola línea de cuota y el total a pagar', async () => {
    await renderRuta(RUTA_PAGO, { prepara: pendienteDePago('torneo-apertura-f5') });

    expect(await screen.findByText(/Torneo Apertura F5/)).toBeInTheDocument();
    expect(screen.getByText(/Los Galácticos/)).toBeInTheDocument();
    expect(screen.getByText('Cuota de inscripción')).toBeInTheDocument();
    expect(screen.getAllByText('$ 20.000,00')).toHaveLength(2); // la cuota y el total
    expect(screen.getByText('Total a pagar')).toBeInTheDocument();
    expect(botonPagar('20.000')).toBeEnabled();
    expect(screen.queryByText(/tasa de servicio/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/método de pago/i)).not.toBeInTheDocument();
  });

  it('al confirmar el pago muestra que la inscripción quedó confirmada, con el equipo y el torneo', async () => {
    const { user } = await renderRuta(RUTA_PAGO, {
      prepara: pendienteDePago('torneo-apertura-f5'),
    });
    await screen.findByText('Cuota de inscripción');

    await user.click(botonPagar('20.000'));

    expect(await screen.findByRole('heading', { name: '¡Inscripción confirmada!' })).toBeInTheDocument();
    expect(screen.getByText(/Los Galácticos/)).toBeInTheDocument();
    expect(screen.getByText(/Torneo Apertura F5/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /inicio/i })).toHaveAttribute('href', '/');
    expect((await inscripcionApi.obtener(ID)).estado).toBe('CONFIRMADA');
  });

  it('informa el cupo que queda, el cierre y que el dinero queda en custodia', async () => {
    await renderRuta(RUTA_PAGO, { prepara: pendienteDePago('torneo-apertura-f5') });

    expect(await screen.findByText('Quedan 10 de 16 lugares')).toBeInTheDocument();
    expect(screen.getByText('Cierre de la inscripción: 31/12/2030')).toBeInTheDocument();
    expect(screen.getByText('Garantía de fondos en custodia')).toBeInTheDocument();
    expect(
      screen.getByText(/El dinero queda retenido de forma segura en la plataforma hasta la finalización del torneo/)
    ).toBeInTheDocument();
  });

  it('si el cobro se rechaza avisa en la página y la inscripción sigue pendiente de pago', async () => {
    const { user } = await renderRuta(RUTA_PAGO, {
      prepara: pendienteDePago('torneo-cobro-rechazado'),
    });
    await screen.findByText('Cuota de inscripción');

    await user.click(botonPagar('15.000'));

    expect(await screen.findByRole('alert')).toHaveTextContent('No se aprobó el pago y no se cobró nada');
    expect(botonPagar('15.000')).toBeEnabled();
    expect((await inscripcionApi.obtener(ID)).estado).toBe('PENDIENTE_PAGO');
  });

  it('si se completó el cupo avisa que no se cobró y la inscripción sigue pendiente de pago', async () => {
    const { user } = await renderRuta(RUTA_PAGO, {
      prepara: pendienteDePago('torneo-cupo-completo'),
    });
    await screen.findByText('Cuota de inscripción');

    await user.click(botonPagar('15.000'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Se completó el cupo del torneo');
    expect(screen.getByRole('alert')).toHaveTextContent('No se te cobró nada');
    expect((await inscripcionApi.obtener(ID)).estado).toBe('PENDIENTE_PAGO');
  });

  it('si la inscripción cerró mientras tanto avisa y la inscripción sigue pendiente de pago', async () => {
    const { user } = await renderRuta(RUTA_PAGO, {
      prepara: pendienteDePago('torneo-apertura-f5'),
    });
    await screen.findByText('Cuota de inscripción');
    // El cierre del torneo es a fines de 2030: pasa la fecha entre que se abrió la pantalla y se pagó.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2031-01-02T12:00:00Z'));

    await user.click(botonPagar('20.000'));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La inscripción a este torneo no está abierta o ya cerró'
    );
    vi.useRealTimers();
    expect((await inscripcionApi.obtener(ID)).estado).toBe('PENDIENTE_PAGO');
  });

  it('si la cuenta está bloqueada lo explica en la página y la inscripción sigue pendiente de pago', async () => {
    const { user } = await renderRuta(RUTA_PAGO, {
      prepara: pendienteDePago('torneo-apertura-f5'),
    });
    await screen.findByText('Cuota de inscripción');
    server.use(
      http.post('*/inscripciones/:id/pago', () =>
        problema(403, 'USUARIO_BLOQUEADO', 'La cuenta tiene un bloqueo vigente')
      )
    );

    await user.click(botonPagar('20.000'));

    expect(await screen.findByRole('alert')).toHaveTextContent('La cuenta está bloqueada');
    expect(botonPagar('20.000')).toBeEnabled();
    expect((await inscripcionApi.obtener(ID)).estado).toBe('PENDIENTE_PAGO');
  });
});
