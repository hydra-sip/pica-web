import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { equipoApi } from '../api/equipoApi';
import { inscripcionApi } from '../api/inscripcionApi';
import { torneoApi } from '../api/torneoApi';
import { delay, http } from 'msw';
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

/** Una inscripción individual ya confirmada con el reglamento: PENDIENTE_PAGO. */
const individualPendienteDePago = (slug: string) => async () => {
  const torneo = await torneoApi.obtenerPorSlug(slug);
  const borrador = await inscripcionApi.crear(torneo.id);
  await inscripcionApi.confirmar(borrador.id, true);
};

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

  it('si la cuenta no está activa lo explica con el texto de la inscripción y sigue pendiente de pago', async () => {
    const { user } = await renderRuta(RUTA_PAGO, {
      prepara: pendienteDePago('torneo-apertura-f5'),
    });
    await screen.findByText('Cuota de inscripción');
    server.use(
      http.post('*/inscripciones/:id/pago', () =>
        problema(409, 'USUARIO_NO_ACTIVO', 'El usuario no está activo')
      )
    );

    await user.click(botonPagar('20.000'));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El usuario no está activo (cuenta bloqueada o sin verificar), así que no se puede continuar.'
    );
    expect(botonPagar('20.000')).toBeEnabled();
    expect((await inscripcionApi.obtener(ID)).estado).toBe('PENDIENTE_PAGO');
  });

  it('al tocar dos veces el botón de pagar manda un solo cobro y muestra que está en curso', async () => {
    const { user } = await renderRuta(RUTA_PAGO, {
      prepara: pendienteDePago('torneo-apertura-f5'),
    });
    await screen.findByText('Cuota de inscripción');
    // El primer cobro queda esperando hasta que el test lo suelta; después responde el mock de siempre.
    let cobros = 0;
    let soltar = () => {};
    const espera = new Promise<void>((resolver) => {
      soltar = resolver;
    });
    server.use(
      http.post('*/inscripciones/:id/pago', async () => {
        cobros += 1;
        await espera;
      })
    );

    await user.dblClick(botonPagar('20.000'));

    expect(screen.getByRole('button', { name: 'Confirmando el pago...' })).toBeDisabled();
    soltar();
    expect(await screen.findByRole('heading', { name: '¡Inscripción confirmada!' })).toBeInTheDocument();
    expect(cobros).toBe(1);
  });

  it('"Modificar nómina" avisa que hay que aceptar el reglamento de nuevo, reabre y vuelve al paso 1', async () => {
    const { user, ubicacion } = await renderRuta(RUTA_PAGO, {
      prepara: pendienteDePago('torneo-apertura-f5'),
    });
    await screen.findByText('Cuota de inscripción');

    await user.click(screen.getByRole('button', { name: 'Modificar nómina' }));
    const aviso = await screen.findByRole('dialog');
    expect(aviso).toHaveTextContent('vas a tener que aceptar el reglamento otra vez');
    await user.click(within(aviso).getByRole('button', { name: 'Sí, modificar la nómina' }));

    await waitFor(() => expect(ubicacion()).toBe(`/inscripciones/${ID}/nomina`));
    expect((await inscripcionApi.obtener(ID)).estado).toBe('BORRADOR');
  });

  it('si se arrepiente en el aviso de "Modificar nómina" la inscripción sigue pendiente de pago', async () => {
    const { user, ubicacion } = await renderRuta(RUTA_PAGO, {
      prepara: pendienteDePago('torneo-apertura-f5'),
    });
    await screen.findByText('Cuota de inscripción');

    await user.click(screen.getByRole('button', { name: 'Modificar nómina' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Volver' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(ubicacion()).toBe(RUTA_PAGO);
    expect((await inscripcionApi.obtener(ID)).estado).toBe('PENDIENTE_PAGO');
  });

  it('si no se puede reabrir muestra el error en el aviso y no sale del paso 2', async () => {
    const { user, ubicacion } = await renderRuta(RUTA_PAGO, {
      prepara: pendienteDePago('torneo-apertura-f5'),
    });
    await screen.findByText('Cuota de inscripción');
    server.use(
      http.put('*/inscripciones/:id/reabrir', () =>
        problema(409, 'INSCRIPCION_NO_EDITABLE', 'Solo se reabre una inscripción pendiente de pago')
      )
    );

    await user.click(screen.getByRole('button', { name: 'Modificar nómina' }));
    const aviso = await screen.findByRole('dialog');
    await user.click(within(aviso).getByRole('button', { name: 'Sí, modificar la nómina' }));

    expect(await within(aviso).findByRole('alert')).toHaveTextContent('cambió de estado');
    expect(ubicacion()).toBe(RUTA_PAGO);
  });

  it('en una inscripción individual muestra al participante y no ofrece modificar la nómina', async () => {
    await renderRuta(RUTA_PAGO, { prepara: individualPendienteDePago('individual-pago') });

    expect(await screen.findByText(/Desafío Individual de Ping Pong/)).toBeInTheDocument();
    expect(screen.getByText(/Participante: Usuario PICA/)).toBeInTheDocument();
    expect(botonPagar('5.000')).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Modificar nómina' })).not.toBeInTheDocument();
  });
});

describe('pantalla final y otros estados de la inscripción', () => {
  it('una de equipo de un torneo gratis, que quedó confirmada sin pago, muestra la pantalla final', async () => {
    await renderRuta(RUTA_PAGO, { prepara: pendienteDePago('torneo-gratis') });

    expect(await screen.findByRole('heading', { name: '¡Inscripción confirmada!' })).toBeInTheDocument();
    expect(screen.getByText(/Los Galácticos/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /inicio/i })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('button', { name: /Confirmar pago/ })).not.toBeInTheDocument();
  });

  it('una individual gratis confirmada muestra al participante en la pantalla final', async () => {
    await renderRuta(RUTA_PAGO, { prepara: individualPendienteDePago('individual-gratis') });

    expect(await screen.findByRole('heading', { name: '¡Inscripción confirmada!' })).toBeInTheDocument();
    expect(screen.getByText(/Participante: Usuario PICA/)).toBeInTheDocument();
  });

  it('en un torneo gratis la pantalla final muestra el nombre del torneo', async () => {
    await renderRuta(RUTA_PAGO, { prepara: pendienteDePago('torneo-gratis') });

    expect(await screen.findByRole('heading', { name: '¡Inscripción confirmada!' })).toBeInTheDocument();
    expect(screen.getByText('Torneo: Torneo Amistoso 3x3')).toBeInTheDocument();
    expect(screen.queryByText(/Ya estás inscripto en el torneo/)).not.toBeInTheDocument();
  });

  it('al recargar una inscripción ya pagada la pantalla final sigue mostrando el nombre del torneo', async () => {
    await renderRuta(RUTA_PAGO, {
      prepara: async () => {
        await pendienteDePago('torneo-apertura-f5')();
        await inscripcionApi.pagar(ID);
      },
    });

    expect(await screen.findByRole('heading', { name: '¡Inscripción confirmada!' })).toBeInTheDocument();
    expect(screen.getByText('Torneo: Torneo Apertura F5')).toBeInTheDocument();
    expect(screen.queryByText(/Ya estás inscripto en el torneo/)).not.toBeInTheDocument();
  });

  it('un borrador lleva al paso 1 para completarlo', async () => {
    const { ubicacion } = await renderRuta(RUTA_PAGO, {
      prepara: async () => {
        const torneo = await torneoApi.obtenerPorSlug('torneo-apertura-f5');
        await inscripcionApi.crear(torneo.id, { nombreEquipoNuevo: 'Los Nuevos', nomina: [101] });
      },
    });

    await waitFor(() => expect(ubicacion()).toBe(`/inscripciones/${ID}/nomina`));
  });

  it('mientras carga la inscripción avisa que está cargando', async () => {
    server.use(http.get('*/inscripciones/:id', () => delay('infinite')));
    await renderRuta(RUTA_PAGO);

    expect(await screen.findByRole('status')).toHaveTextContent('Cargando inscripción');
  });

  it('una inscripción cancelada se avisa con claridad', async () => {
    // 901 es la inscripción cancelada de Los Halcones en torneo-apertura-f5 (datos de los mocks).
    await renderRuta('/inscripciones/901/pago');

    await screen.findByText(/Esta inscripción fue cancelada/);
    expect(screen.getByRole('status')).toHaveTextContent('Esta inscripción fue cancelada');
    expect(screen.queryByRole('button', { name: /Confirmar pago/ })).not.toBeInTheDocument();
  });

  it.each([
    ['ajena', '/inscripciones/900/pago'],
    ['inexistente', '/inscripciones/4242/pago'],
  ])('una inscripción %s se avisa como que no existe o no es tuya', async (_caso, ruta) => {
    await renderRuta(ruta);

    expect(await screen.findByRole('alert')).toHaveTextContent('La inscripción no existe o no es tuya');
  });
});
