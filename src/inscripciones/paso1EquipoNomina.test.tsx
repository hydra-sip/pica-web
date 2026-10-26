import { afterEach, describe, expect, it, vi } from 'vitest';
import { delay, http, HttpResponse } from 'msw';
import { screen, waitFor, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { equipoApi } from '../api/equipoApi';
import { inscripcionApi } from '../api/inscripcionApi';
import { problema } from '../mocks/adminHandlers';
import { server } from '../mocks/server';
import { renderRuta } from '../test/renderRuta';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

// Los equipos del capitán de los mocks, por nombre (hay que estar logueado, ver renderRuta).
const idDeEquipo = async (nombre: string) =>
  (await equipoApi.listarMios()).content.find((e) => e.nombre === nombre)!.id;

const ALTA_F5 = '/torneos/torneo-apertura-f5/inscripcion';

const idDeLaUbicacion = (ruta: string) => Number(/\/inscripciones\/(\d+)\//.exec(ruta)![1]);

// Nombre de cada jugador de los mocks según lo que se escribe para buscarlo.
const JUGADOR: Record<string, string> = {
  lucas: 'Lucas Fernández',
  mrossi: 'Matías Rossi',
  joaco: 'Joaquín Gómez',
  salva: 'Salvador Báez',
  sofi: 'Sofía Martínez',
  zoe: 'Zoe Bloqueada',
  tardio: 'Tomás Tardío',
};

// Busca por `texto` y suma al jugador que corresponde, esperando a que llegue su resultado.
const sumarJugador = async (user: UserEvent, texto: string) => {
  const buscador = await screen.findByRole('searchbox', { name: /buscar jugador/i });
  await user.clear(buscador);
  await user.type(buscador, texto);
  await user.click(await screen.findByRole('button', { name: `Sumar a ${JUGADOR[texto]}` }));
};

describe('paso 1: equipo y nómina (alta)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra el torneo con lo que pide la nómina y al capitán fijo, sin poder sacarlo', async () => {
    await renderRuta(ALTA_F5);

    expect(await screen.findByText('Torneo Apertura F5')).toBeInTheDocument();
    expect(screen.getByText(/nómina de al menos 5 jugadores/i)).toBeInTheDocument();
    expect(screen.getByText('1 jugador (mínimo 5)')).toBeInTheDocument();
    expect(screen.getByText(/Usuario PICA \(Capitán\)/)).toBeInTheDocument();
    expect(screen.getByText('@usuario')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sacar/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/titular|suplente|DNI/i)).not.toBeInTheDocument();
  });

  it('deja elegir uno de los equipos propios y deshabilita el que ya tiene una inscripción en el torneo', async () => {
    const { user } = await renderRuta(ALTA_F5);

    const selector = await screen.findByLabelText('Equipo');
    expect(await screen.findByRole('option', { name: 'Los Galácticos' })).toBeEnabled();
    expect(screen.getByRole('option', { name: 'Deportivo Luján' })).toBeEnabled();
    const halcones = screen.getByRole('option', { name: /Los Halcones/ });
    expect(halcones).toBeDisabled();
    expect(halcones).toHaveTextContent('ya tiene una inscripción en este torneo');

    await user.selectOptions(selector, 'Los Galácticos');
    expect(selector).toHaveValue(String(await idDeEquipo('Los Galácticos')));
    expect(screen.queryByLabelText('Nombre del equipo nuevo')).not.toBeInTheDocument();
  });

  it('con "Crear un equipo nuevo" pide el nombre', async () => {
    const { user } = await renderRuta(ALTA_F5);

    await user.selectOptions(await screen.findByLabelText('Equipo'), 'Crear un equipo nuevo');

    expect(screen.getByLabelText('Nombre del equipo nuevo')).toBeInTheDocument();
  });

  it('a un capitán sin equipos le ofrece crear uno nuevo, sin lista vacía', async () => {
    server.use(
      http.get(`${API_URL}/equipos/mios`, () =>
        HttpResponse.json({
          content: [],
          page: { size: 20, number: 0, totalElements: 0, totalPages: 0 },
        })
      )
    );
    await renderRuta(ALTA_F5);

    expect(await screen.findByLabelText('Nombre del equipo nuevo')).toBeInTheDocument();
    expect(screen.getByText(/todavía no tenés equipos/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Equipo')).not.toBeInTheDocument();
  });

  it('la búsqueda espera al menos tres letras y muestra nombre y @usuario de cada jugador', async () => {
    const { user } = await renderRuta(ALTA_F5);
    const buscador = await screen.findByRole('searchbox', { name: /buscar jugador/i });

    await user.type(buscador, 'lu');
    expect(screen.getByText('Escribí al menos 3 letras para buscar.')).toBeInTheDocument();
    expect(screen.queryByText('Lucas Fernández')).not.toBeInTheDocument();

    await user.type(buscador, 'c');
    const resultado = await screen.findByRole('listitem', { name: /Lucas Fernández/ });
    expect(within(resultado).getByText('@lucas_f99')).toBeInTheDocument();
    expect(screen.queryByText('Escribí al menos 3 letras para buscar.')).not.toBeInTheDocument();
  });

  it('mientras busca jugadores avisa que está buscando', async () => {
    server.use(http.get(`${API_URL}/usuarios`, () => delay('infinite')));
    const { user } = await renderRuta(ALTA_F5);

    await user.type(await screen.findByRole('searchbox', { name: /buscar jugador/i }), 'lucas');

    expect(await screen.findByRole('status')).toHaveTextContent('Buscando');
  });

  it('mientras cargan los equipos avisa que está cargando', async () => {
    server.use(http.get(`${API_URL}/equipos/mios`, () => delay('infinite')));
    await renderRuta(ALTA_F5);

    await screen.findByText('Cargando tus equipos...');
    expect(screen.getByRole('status')).toHaveTextContent('Cargando tus equipos');
  });

  it('avisa si la búsqueda no encuentra a nadie', async () => {
    const { user } = await renderRuta(ALTA_F5);

    await user.type(await screen.findByRole('searchbox', { name: /buscar jugador/i }), 'zzzz');

    expect(
      await screen.findByText('No encontramos jugadores con esa búsqueda.')
    ).toBeInTheDocument();
  });

  it('suma un jugador a la nómina con un toque, lo cuenta y no deja sumarlo dos veces', async () => {
    const { user } = await renderRuta(ALTA_F5);

    await sumarJugador(user, 'lucas');

    const nomina = screen.getByRole('list', { name: 'Nómina' });
    expect(within(nomina).getByText('Lucas Fernández')).toBeInTheDocument();
    expect(within(nomina).getByText('@lucas_f99')).toBeInTheDocument();
    expect(screen.getByText('2 jugadores (mínimo 5)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sumar a Lucas Fernández' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Sumar a Lucas Fernández' })).toHaveTextContent(
      'En la nómina'
    );
  });

  it('saca a un jugador de la nómina', async () => {
    const { user } = await renderRuta(ALTA_F5);
    await sumarJugador(user, 'lucas');

    await user.click(screen.getByRole('button', { name: 'Sacar a Lucas Fernández' }));

    const nomina = screen.getByRole('list', { name: 'Nómina' });
    expect(within(nomina).queryByText('Lucas Fernández')).not.toBeInTheDocument();
    expect(screen.getByText('1 jugador (mínimo 5)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sumar a Lucas Fernández' })).toBeEnabled();
  });

  it('con la nómina por encima del máximo del torneo, el aviso es el del back y el borrador queda guardado', async () => {
    // El tipo público del torneo no trae el máximo de la nómina: lo valida el back al confirmar.
    const { user } = await renderRuta('/torneos/torneo-gratis/inscripcion'); // nómina de 3 a 4
    await user.selectOptions(await screen.findByLabelText('Equipo'), 'Los Galácticos');
    for (const texto of ['lucas', 'mrossi', 'joaco', 'salva']) await sumarJugador(user, texto);
    await user.click(screen.getByLabelText('Acepto el Reglamento y Código de Conducta'));

    await user.click(screen.getByRole('button', { name: 'Confirmar inscripción' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La nómina no cumple lo que pide el torneo'
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Tu borrador quedó guardado.');
    const [borrador] = (await inscripcionApi.listarMias({ torneoId: 3 })).content;
    expect(borrador.estado).toBe('BORRADOR');
  });

  it('muestra el reglamento con el enlace al PDF en otra pestaña', async () => {
    await renderRuta(ALTA_F5);

    const enlace = await screen.findByRole('link', { name: 'Ver reglamento oficial en PDF' });
    expect(enlace).toHaveAttribute(
      'href',
      'https://example.com/reglamentos/torneo-apertura-f5.pdf'
    );
    expect(enlace).toHaveAttribute('target', '_blank');
    expect(screen.getByLabelText('Acepto el Reglamento y Código de Conducta')).not.toBeChecked();
  });

  it('el botón de continuar muestra el monto y sigue deshabilitado hasta tener reglamento, equipo y nómina válida', async () => {
    const { user } = await renderRuta(ALTA_F5); // nómina de 5 a 7
    const continuar = await screen.findByRole('button', {
      name: /^Continuar al pago \(\$\s20\.000,00\)$/,
    });
    expect(continuar).toBeDisabled();

    await user.selectOptions(await screen.findByLabelText('Equipo'), 'Los Galácticos');
    await user.click(screen.getByLabelText('Acepto el Reglamento y Código de Conducta'));
    expect(continuar).toBeDisabled(); // con un solo jugador no llega al mínimo

    for (const texto of ['lucas', 'mrossi', 'joaco', 'salva']) await sumarJugador(user, texto);
    expect(continuar).toBeEnabled(); // 5 jugadores

    await user.click(screen.getByLabelText('Acepto el Reglamento y Código de Conducta'));
    expect(continuar).toBeDisabled();
  });

  it('con un nombre de equipo nuevo en blanco no deja continuar', async () => {
    const { user } = await renderRuta('/torneos/torneo-gratis/inscripcion'); // 3 a 4, gratis
    await user.selectOptions(await screen.findByLabelText('Equipo'), 'Crear un equipo nuevo');
    await user.click(screen.getByLabelText('Acepto el Reglamento y Código de Conducta'));
    for (const texto of ['lucas', 'mrossi']) await sumarJugador(user, texto);
    const confirmar = screen.getByRole('button', { name: 'Confirmar inscripción' });
    expect(confirmar).toBeDisabled();

    await user.type(screen.getByLabelText('Nombre del equipo nuevo'), '   ');
    expect(confirmar).toBeDisabled();
    await user.type(screen.getByLabelText('Nombre del equipo nuevo'), 'Los Nuevos');
    expect(confirmar).toBeEnabled();
  });

  it('"Continuar al pago" guarda el borrador, confirma con el reglamento y lleva al paso 2', async () => {
    const { user, ubicacion } = await renderRuta(ALTA_F5);
    await user.selectOptions(await screen.findByLabelText('Equipo'), 'Los Galácticos');
    for (const texto of ['lucas', 'mrossi', 'joaco', 'salva']) await sumarJugador(user, texto);
    await user.click(screen.getByLabelText('Acepto el Reglamento y Código de Conducta'));

    await user.click(screen.getByRole('button', { name: /^Continuar al pago/ }));

    await waitFor(() => expect(ubicacion()).toMatch(/^\/inscripciones\/\d+\/pago$/));
    const inscripcion = await inscripcionApi.obtener(idDeLaUbicacion(ubicacion()));
    expect(inscripcion.estado).toBe('PENDIENTE_PAGO');
    expect(inscripcion.equipo?.nombre).toBe('Los Galácticos');
    expect(inscripcion.nomina?.map((j) => j.username)).toEqual([
      'usuario',
      'lucas_f99',
      'mrossi',
      'joaco_g',
      'salva_b',
    ]);
    expect(inscripcion.reglamentoAceptadoEn).toBeTruthy();
  });

  it('"Guardar como borrador y salir" guarda sin confirmar y vuelve al inicio, sin pedir el reglamento', async () => {
    const { user, ubicacion } = await renderRuta(ALTA_F5);
    await user.selectOptions(await screen.findByLabelText('Equipo'), 'Los Galácticos');
    await sumarJugador(user, 'lucas');

    await user.click(screen.getByRole('button', { name: 'Guardar como borrador y salir' }));

    await waitFor(() => expect(ubicacion()).toBe('/'));
    const [borrador] = (await inscripcionApi.listarMias({ torneoId: 1 })).content;
    expect(borrador.estado).toBe('BORRADOR');
    expect(borrador.equipo?.nombre).toBe('Los Galácticos');
    expect((await inscripcionApi.obtener(borrador.id)).nomina).toHaveLength(2);
  });

  it('con un nombre nuevo crea el equipo junto con la inscripción', async () => {
    const { user, ubicacion } = await renderRuta('/torneos/torneo-gratis/inscripcion'); // 3 a 4, gratis
    await user.selectOptions(await screen.findByLabelText('Equipo'), 'Crear un equipo nuevo');
    await user.type(screen.getByLabelText('Nombre del equipo nuevo'), 'Los Nuevos');
    for (const texto of ['lucas', 'mrossi']) await sumarJugador(user, texto);
    await user.click(screen.getByLabelText('Acepto el Reglamento y Código de Conducta'));

    await user.click(screen.getByRole('button', { name: 'Confirmar inscripción' }));

    await waitFor(() => expect(ubicacion()).toMatch(/^\/inscripciones\/\d+\/pago$/));
    const inscripcion = await inscripcionApi.obtener(idDeLaUbicacion(ubicacion()));
    expect(inscripcion.equipo?.nombre).toBe('Los Nuevos');
    expect(inscripcion.estado).toBe('CONFIRMADA'); // torneo gratis: no hay pago
  });

  it.each([
    [
      'sofi',
      'Hay un jugador (o vos como capitán) que ya figura en otra inscripción de este torneo',
    ],
    [
      'zoe',
      'Tu cuenta, o la de un jugador de la nómina, tiene un bloqueo vigente. Si creés que es un error, escribile a un administrador.',
    ],
    [
      'tardio',
      'El usuario no está activo (cuenta bloqueada o sin verificar), así que no se puede continuar.',
    ],
  ])(
    'si al guardar el back rechaza a un jugador (%s), lo avisa en la página y no navega',
    async (texto, mensaje) => {
      const { user, ubicacion } = await renderRuta(ALTA_F5);
      await user.selectOptions(await screen.findByLabelText('Equipo'), 'Los Galácticos');
      await sumarJugador(user, 'lucas');
      await sumarJugador(user, texto);

      await user.click(screen.getByRole('button', { name: 'Guardar como borrador y salir' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(mensaje);
      expect(ubicacion()).toBe(ALTA_F5);
      expect(screen.getByRole('button', { name: 'Guardar como borrador y salir' })).toBeEnabled();
    }
  );

  it('si la inscripción cierra mientras arma la nómina, muestra el aviso del torneo', async () => {
    // Un torneo cerrado ya no abre el formulario (la entrada lo avisa): acá cierra después de abrirlo.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-25T12:00:00Z'));
    const { user } = await renderRuta(ALTA_F5);
    await user.selectOptions(await screen.findByLabelText('Equipo'), 'Los Galácticos');
    for (const texto of ['lucas', 'mrossi']) await sumarJugador(user, texto);
    vi.setSystemTime(new Date('2031-01-02T12:00:00Z')); // pasó el cierre (2030-12-31)

    await user.click(screen.getByRole('button', { name: 'Guardar como borrador y salir' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La inscripción a este torneo no está abierta o ya cerró.'
    );
  });

  it('si falla la confirmación el borrador queda guardado, se muestra el error y reintentar no crea otro', async () => {
    server.use(
      http.put(`${API_URL}/inscripciones/:id/confirmar`, () =>
        problema(409, 'COBRO_RECHAZADO', 'No se aprobó el pago')
      )
    );
    const { user, ubicacion } = await renderRuta('/torneos/torneo-gratis/inscripcion'); // 3 a 4
    await user.selectOptions(await screen.findByLabelText('Equipo'), 'Crear un equipo nuevo');
    await user.type(screen.getByLabelText('Nombre del equipo nuevo'), 'Los Reintentos');
    for (const texto of ['lucas', 'mrossi']) await sumarJugador(user, texto);
    await user.click(screen.getByLabelText('Acepto el Reglamento y Código de Conducta'));

    await user.click(screen.getByRole('button', { name: 'Confirmar inscripción' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Tu borrador quedó guardado.');
    expect(ubicacion()).toBe('/torneos/torneo-gratis/inscripcion');
    const borradores = async () =>
      (await inscripcionApi.listarMias({ torneoId: 3 })).content.filter(
        (i) => i.estado === 'BORRADOR'
      );
    expect(await borradores()).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Confirmar inscripción' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Confirmar inscripción' })).toBeEnabled()
    );

    // El reintento edita el borrador y vuelve a fallar en la confirmación, no en el guardado.
    expect(screen.getByRole('alert')).toHaveTextContent('Tu borrador quedó guardado.');
    expect(await borradores()).toHaveLength(1);
    expect(
      (await equipoApi.listarMios()).content.filter((e) => e.nombre === 'Los Reintentos')
    ).toHaveLength(1);
  });
});
