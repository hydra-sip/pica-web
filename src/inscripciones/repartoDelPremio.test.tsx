import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { authApi } from '../api/authApi';
import { inscripcionApi, type InscripcionDetalle } from '../api/inscripcionApi';
import { problema } from '../mocks/adminHandlers';
import { server } from '../mocks/server';
import { renderRuta } from '../test/renderRuta';

// CR-05: el capitán reparte el premio del equipo entre los integrantes de la nómina.

const ALTA_F5 = '/torneos/torneo-apertura-f5/inscripcion'; // nómina de 5 a 7
const TORNEO_F5 = 1;
const CAPITAN = 'Usuario PICA';
const LUCAS = 101;
const MATIAS = 102;

const JUGADOR: Record<string, string> = {
  lucas: 'Lucas Fernández',
  mrossi: 'Matías Rossi',
  joaco: 'Joaquín Gómez',
  salva: 'Salvador Báez',
};

const sumarJugador = async (user: UserEvent, texto: string) => {
  const buscador = await screen.findByRole('searchbox', { name: /buscar jugador/i });
  await user.clear(buscador);
  await user.type(buscador, texto);
  await user.click(await screen.findByRole('button', { name: `Sumar a ${JUGADOR[texto]}` }));
};

const campo = (nombre: string) =>
  screen.getByRole('textbox', { name: `% del premio de ${nombre}` });

const escribir = async (user: UserEvent, nombre: string, pct: string) => {
  await user.clear(campo(nombre));
  await user.type(campo(nombre), pct);
};

const idDeLaUbicacion = (ruta: string) => Number(/\/inscripciones\/(\d+)\//.exec(ruta)![1]);

const pcts = (i: InscripcionDetalle) =>
  Object.fromEntries((i.reparto ?? []).map((r) => [r.usuarioId, r.pct]));

describe('reparto del premio en el paso 1 (CR-05)', () => {
  it('cada integrante arranca en partes iguales, con el total en vivo, y vuelve a partes iguales si cambia la nómina', async () => {
    const { user } = await renderRuta(ALTA_F5);
    await user.selectOptions(await screen.findByLabelText('Equipo'), 'Los Galácticos');

    expect(campo(CAPITAN)).toHaveValue('100');
    await sumarJugador(user, 'lucas');
    await sumarJugador(user, 'mrossi');

    expect(campo(CAPITAN)).toHaveValue('33,34');
    expect(campo('Lucas Fernández')).toHaveValue('33,33');
    expect(campo('Matías Rossi')).toHaveValue('33,33');
    expect(screen.getByText('Total del reparto: 100 %')).toBeInTheDocument();

    await escribir(user, 'Lucas Fernández', '20');
    expect(screen.getByText('Total del reparto: 86,67 %')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sacar a Matías Rossi' }));
    expect(campo(CAPITAN)).toHaveValue('50');
    expect(campo('Lucas Fernández')).toHaveValue('50');
  });

  it('si no suma 100 lo avisa y no deja guardar ni continuar', async () => {
    const { user } = await renderRuta(ALTA_F5);
    await user.selectOptions(await screen.findByLabelText('Equipo'), 'Los Galácticos');
    for (const texto of ['lucas', 'mrossi', 'joaco', 'salva']) await sumarJugador(user, texto);
    await user.click(screen.getByLabelText('Acepto el Reglamento y Código de Conducta'));

    await escribir(user, CAPITAN, '50');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'El reparto tiene que sumar 100 %: ahora suma 130 %.'
    );
    expect(screen.getByRole('button', { name: /^Continuar al pago/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Guardar como borrador y salir' })).toBeDisabled();

    // 50 + 9,5 + 10,5 + 10 + 20
    await escribir(user, 'Lucas Fernández', '9,5');
    await escribir(user, 'Matías Rossi', '10,5');
    await escribir(user, 'Joaquín Gómez', '10');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Continuar al pago/ })).toBeEnabled();
  });

  it('un % con más de dos decimales o fuera de rango se avisa', async () => {
    const { user } = await renderRuta(ALTA_F5);
    await user.selectOptions(await screen.findByLabelText('Equipo'), 'Los Galácticos');
    await sumarJugador(user, 'lucas');

    await escribir(user, 'Lucas Fernández', '50,005');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Cada % va de 0 a 100, con hasta dos decimales.'
    );
    expect(screen.getByRole('button', { name: 'Guardar como borrador y salir' })).toBeDisabled();
  });

  it('"Continuar al pago" guarda el reparto después de la nómina, con 0 % para un suplente', async () => {
    const { user, ubicacion } = await renderRuta(ALTA_F5);
    await user.selectOptions(await screen.findByLabelText('Equipo'), 'Los Galácticos');
    for (const texto of ['lucas', 'mrossi', 'joaco', 'salva']) await sumarJugador(user, texto);
    await user.click(screen.getByLabelText('Acepto el Reglamento y Código de Conducta'));
    await escribir(user, CAPITAN, '40');
    await escribir(user, 'Lucas Fernández', '0');

    await user.click(screen.getByRole('button', { name: /^Continuar al pago/ }));

    await waitFor(() => expect(ubicacion()).toMatch(/^\/inscripciones\/\d+\/pago$/));
    const inscripcion = await inscripcionApi.obtener(idDeLaUbicacion(ubicacion()));
    expect(inscripcion.estado).toBe('PENDIENTE_PAGO');
    expect(pcts(inscripcion)).toEqual({ 2: 40, 101: 0, 102: 20, 103: 20, 104: 20 });
  });

  it('con partes iguales no manda el reparto aparte: ya lo arma el back al guardar la nómina', async () => {
    let repartos = 0;
    server.use(
      http.put('*/inscripciones/:id/reparto', () => {
        repartos++;
        return undefined;
      })
    );
    const { user, ubicacion } = await renderRuta(ALTA_F5);
    await user.selectOptions(await screen.findByLabelText('Equipo'), 'Los Galácticos');
    await sumarJugador(user, 'lucas');

    await user.click(screen.getByRole('button', { name: 'Guardar como borrador y salir' }));

    await waitFor(() => expect(ubicacion()).toBe('/torneos/torneo-apertura-f5'));
    expect(repartos).toBe(0);
  });

  it('si el back rechaza el reparto (400) lo muestra y el borrador queda guardado', async () => {
    server.use(
      http.put('*/inscripciones/:id/reparto', () =>
        problema(400, 'VALIDACION', 'El reparto tiene que sumar 100')
      )
    );
    const { user, ubicacion } = await renderRuta(ALTA_F5);
    await user.selectOptions(await screen.findByLabelText('Equipo'), 'Los Galácticos');
    for (const texto of ['lucas', 'mrossi', 'joaco', 'salva']) await sumarJugador(user, texto);
    await user.click(screen.getByLabelText('Acepto el Reglamento y Código de Conducta'));
    await escribir(user, CAPITAN, '40');
    await escribir(user, 'Lucas Fernández', '0');

    await user.click(screen.getByRole('button', { name: /^Continuar al pago/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo guardar el reparto: tienen que estar todos los integrantes, con un % de 0 a 100 (hasta dos decimales), y sumar 100 %. Tu borrador quedó guardado.'
    );
    expect(ubicacion()).toBe(ALTA_F5);
  });

  it('al retomar un borrador muestra el reparto guardado', async () => {
    await authApi.login('usuario', 'user123');
    const { id } = await inscripcionApi.crear(TORNEO_F5, {
      nombreEquipoNuevo: 'Los Repartidos',
      nomina: [LUCAS, MATIAS],
    });
    await inscripcionApi.repartir(id, [
      { usuarioId: 2, pct: 50 },
      { usuarioId: LUCAS, pct: 30 },
      { usuarioId: MATIAS, pct: 20 },
    ]);

    await renderRuta(`/inscripciones/${id}/nomina`);

    expect(await screen.findByRole('textbox', { name: `% del premio de ${CAPITAN}` })).toHaveValue(
      '50'
    );
    expect(campo('Lucas Fernández')).toHaveValue('30');
    expect(campo('Matías Rossi')).toHaveValue('20');
  });
});

// Deportivo Luján, confirmado en la Copa de Invierno (abierta): capitán, Joaquín Gómez y Salvador Báez.
const ABIERTA = '/inscripciones/902';
// Los Galácticos en la Copa Sin Lugar (abierta, cupo completo) y en la Copa Cerrada.
const CUPO_COMPLETO = '/inscripciones/903';
const CERRADA = '/inscripciones/904';

const filasDelReparto = async () =>
  within(await screen.findByRole('list', { name: 'Reparto del premio' })).getAllByRole('listitem');

describe('reparto del premio en el detalle de la inscripción (CR-05)', () => {
  it('el capitán lo ve y lo cambia mientras la inscripción del torneo siga abierta', async () => {
    const { user } = await renderRuta(ABIERTA);

    const filas = await filasDelReparto();
    expect(filas.map((f) => f.textContent)).toEqual([
      expect.stringMatching(/Usuario PICA \(Capitán\).*33,34 %/),
      expect.stringMatching(/Joaquín Gómez.*33,33 %/),
      expect.stringMatching(/Salvador Báez.*33,33 %/),
    ]);

    await user.click(screen.getByRole('button', { name: 'Cambiar el reparto' }));
    await escribir(user, CAPITAN, '50');
    await escribir(user, 'Joaquín Gómez', '25');
    await escribir(user, 'Salvador Báez', '25');
    await user.click(screen.getByRole('button', { name: 'Guardar el reparto' }));

    expect(await screen.findByText('Guardaste el reparto del premio.')).toBeInTheDocument();
    expect((await filasDelReparto())[0]).toHaveTextContent(/50 %/);
    expect(pcts(await inscripcionApi.obtener(902))).toEqual({ 2: 50, 103: 25, 104: 25 });
  });

  it('mientras edita, si no suma 100 no deja guardar; cancelar vuelve al reparto guardado', async () => {
    const { user } = await renderRuta(ABIERTA);
    await user.click(await screen.findByRole('button', { name: 'Cambiar el reparto' }));

    await escribir(user, CAPITAN, '10');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'El reparto tiene que sumar 100 %: ahora suma 76,66 %.'
    );
    expect(screen.getByRole('button', { name: 'Guardar el reparto' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect((await filasDelReparto())[0]).toHaveTextContent(/33,34 %/);
  });

  it('con el cupo completo se puede cambiar igual: alcanza con que la inscripción siga abierta', async () => {
    await renderRuta(CUPO_COMPLETO);

    expect(await screen.findByRole('button', { name: 'Cambiar el reparto' })).toBeInTheDocument();
  });

  it('con la inscripción del torneo cerrada queda en solo lectura', async () => {
    await renderRuta(CERRADA);

    expect(await filasDelReparto()).toHaveLength(3);
    expect(screen.queryByRole('button', { name: 'Cambiar el reparto' })).not.toBeInTheDocument();
  });

  it('si el back rechaza el reparto lo muestra sin salir de la edición', async () => {
    server.use(
      http.put('*/inscripciones/:id/reparto', () =>
        problema(400, 'VALIDACION', 'El reparto tiene que sumar 100')
      )
    );
    const { user } = await renderRuta(ABIERTA);
    await user.click(await screen.findByRole('button', { name: 'Cambiar el reparto' }));
    await escribir(user, CAPITAN, '50');
    await escribir(user, 'Joaquín Gómez', '25');
    await escribir(user, 'Salvador Báez', '25');

    await user.click(screen.getByRole('button', { name: 'Guardar el reparto' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar el reparto');
    expect(screen.getByRole('button', { name: 'Guardar el reparto' })).toBeInTheDocument();
  });

  it('si la inscripción del torneo cerró mientras tanto, lo avisa y queda en solo lectura', async () => {
    server.use(
      http.put('*/inscripciones/:id/reparto', () =>
        problema(409, 'INSCRIPCION_NO_ABIERTA', 'La inscripción del torneo ya cerró')
      )
    );
    const { user } = await renderRuta(ABIERTA);
    await user.click(await screen.findByRole('button', { name: 'Cambiar el reparto' }));
    await escribir(user, CAPITAN, '33,33');
    await escribir(user, 'Joaquín Gómez', '33,34');

    await user.click(screen.getByRole('button', { name: 'Guardar el reparto' }));

    expect(
      await screen.findByText('La inscripción del torneo ya cerró: el reparto quedó fijo.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar el reparto' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cambiar el reparto' })).not.toBeInTheDocument();
  });
});

// Los Rivales: el capitán es otro (110); el usuario de la sesión (2) mira como jugador u organizador.
const deOtroCapitan = (cambios: Partial<InscripcionDetalle>): InscripcionDetalle => ({
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
  equipo: { id: 10, nombre: 'Los Rivales', capitanId: 110 },
  nomina: [2, 110, 105].map((id) => ({
    id,
    username: `u${id}`,
    nombres: `Jugador${id}`,
    apellidos: 'Test',
  })),
  reparto: [
    { usuarioId: 2, pct: 20 },
    { usuarioId: 110, pct: 60 },
    { usuarioId: 105, pct: 20 },
  ],
  rol: 'JUGADOR',
  ...cambios,
});

const conDetalle = (detalle: InscripcionDetalle) =>
  server.use(
    http.get('*/inscripciones/:id', ({ params }) =>
      Number(params.id) === detalle.id ? HttpResponse.json(detalle) : undefined
    )
  );

describe('reparto del premio según quién mira (CR-05)', () => {
  it.each([['JUGADOR' as const], ['ORGANIZADOR' as const]])(
    'el %s lo ve en solo lectura, con el capitán primero',
    async (rol) => {
      conDetalle(deOtroCapitan({ rol }));

      await renderRuta('/inscripciones/900');

      const filas = await filasDelReparto();
      expect(filas[0]).toHaveTextContent(/Jugador110 Test \(Capitán\).*60 %/);
      expect(filas[1]).toHaveTextContent(/Jugador2 Test.*20 %/);
      expect(screen.queryByRole('button', { name: 'Cambiar el reparto' })).not.toBeInTheDocument();
    }
  );

  it('sin reparto (un torneo que cerró la inscripción antes del cambio) dice que cobra el capitán', async () => {
    conDetalle(deOtroCapitan({ reparto: null }));

    await renderRuta('/inscripciones/900');

    expect(
      await screen.findByText('El premio de este equipo lo cobra entero el capitán.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Reparto del premio' })).not.toBeInTheDocument();
  });
});
