import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { equipoApi } from '../api/equipoApi';
import { server } from '../mocks/server';
import { renderRuta } from '../test/renderRuta';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

// Los equipos del capitán de los mocks, por nombre (hay que estar logueado, ver renderRuta).
const idDeEquipo = async (nombre: string) =>
  (await equipoApi.listarMios()).content.find((e) => e.nombre === nombre)!.id;

const ALTA_F5 = '/torneos/torneo-apertura-f5/inscripcion';

// Busca por `texto` y suma al primer resultado.
const sumarJugador = async (user: UserEvent, texto: string) => {
  const buscador = await screen.findByRole('searchbox', { name: /buscar jugador/i });
  await user.clear(buscador);
  await user.type(buscador, texto);
  const sumar = await screen.findByRole('button', { name: /^Sumar a / });
  await user.click(sumar);
};

describe('paso 1: equipo y nómina (alta)', () => {
  it('muestra el torneo con lo que pide la nómina y al capitán fijo, sin poder sacarlo', async () => {
    await renderRuta(ALTA_F5);

    expect(await screen.findByText('Torneo Apertura F5')).toBeInTheDocument();
    expect(screen.getByText(/nómina de 5 a 7 jugadores/i)).toBeInTheDocument();
    expect(screen.getByText('1 jugador (mínimo 5, máximo 7)')).toBeInTheDocument();
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
    expect(screen.getByText('2 jugadores (mínimo 5, máximo 7)')).toBeInTheDocument();
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
    expect(screen.getByText('1 jugador (mínimo 5, máximo 7)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sumar a Lucas Fernández' })).toBeEnabled();
  });

  it('con la nómina en el máximo no deja sumar a nadie más', async () => {
    const { user } = await renderRuta('/torneos/torneo-gratis/inscripcion'); // nómina de 3 a 4
    await sumarJugador(user, 'lucas');
    await sumarJugador(user, 'mrossi');
    await sumarJugador(user, 'joaco');

    await user.clear(screen.getByRole('searchbox', { name: /buscar jugador/i }));
    await user.type(screen.getByRole('searchbox', { name: /buscar jugador/i }), 'salva');

    expect(await screen.findByRole('button', { name: 'Sumar a Salvador Báez' })).toBeDisabled();
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

    for (const texto of ['lucas', 'mrossi', 'joaco', 'ana_r']) await sumarJugador(user, texto);
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
});
