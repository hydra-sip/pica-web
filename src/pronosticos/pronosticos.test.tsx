import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../mocks/server';
import { renderRuta } from '../test/renderRuta';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

describe('HU-306 / T306-2: Pronósticos y ranking', () => {
  it('muestra el listado de partidos con su estado de ventana y los equipos', async () => {
    await renderRuta('/pronosticos');

    // Título y esquema de puntuación
    expect(await screen.findByRole('heading', { name: /pronósticos y ranking/i })).toBeInTheDocument();
    expect(screen.getByText(/esquema de puntuación oficial/i)).toBeInTheDocument();
    expect(screen.getByText(/\+3 puntos por acierto/i)).toBeInTheDocument();
    expect(screen.getByText(/0 puntos por desacierto/i)).toBeInTheDocument();

    // Partidos presentes
    expect(await screen.findByText('Los Leones FC')).toBeInTheDocument();
    expect(screen.getByText('Águilas Doradas')).toBeInTheDocument();
    expect(screen.getByText('Halcones del Norte')).toBeInTheDocument();
  });

  it('cargar un pronóstico válido antes del cierre de la ventana queda registrado', async () => {
    const { user } = await renderRuta('/pronosticos');

    const card = await screen.findByTestId('partido-card-101');
    expect(card).toBeInTheDocument();

    // En partido 101, local es Los Leones FC y todavía no tiene pronóstico
    const btnLocal = within(card).getByRole('button', { name: /pronosticar victoria local/i });
    expect(btnLocal).not.toBeDisabled();
    expect(btnLocal).not.toHaveClass('seleccionado');

    // El usuario selecciona "1" (Local)
    await user.click(btnLocal);

    // Debe quedar marcado como seleccionado
    await waitFor(() => {
      expect(btnLocal).toHaveClass('seleccionado');
    });

    // Muestra que el pronóstico quedó registrado como pendiente
    expect(within(card).getByText(/pronóstico registrado \(local\) · pendiente/i)).toBeInTheDocument();
  });

  it('permite modificar un pronóstico mientras la ventana esté abierta', async () => {
    const { user } = await renderRuta('/pronosticos');

    // Partido 102 ya tiene pronóstico '1' cargado en el mock
    const card = await screen.findByTestId('partido-card-102');
    const btnLocal = within(card).getByRole('button', { name: /pronosticar victoria local/i });
    const btnEmpate = within(card).getByRole('button', { name: /pronosticar empate/i });

    expect(btnLocal).toHaveClass('seleccionado');

    // Cambiar a Empate ('X')
    await user.click(btnEmpate);

    await waitFor(() => {
      expect(btnEmpate).toHaveClass('seleccionado');
      expect(btnLocal).not.toHaveClass('seleccionado');
    });

    expect(within(card).getByText(/pronóstico registrado \(empate\) · pendiente/i)).toBeInTheDocument();
  });

  it('comprueba que un usuario no puede modificar su pronóstico una vez cerrada la ventana', async () => {
    await renderRuta('/pronosticos');

    // Partido 103 está CONFIRMADO y su ventana de pronósticos cerró
    const card = await screen.findByTestId('partido-card-103');

    const btnLocal = within(card).getByRole('button', { name: /pronosticar victoria local/i });
    const btnEmpate = within(card).getByRole('button', { name: /pronosticar empate/i });
    const btnVisitante = within(card).getByRole('button', { name: /pronosticar victoria visitante/i });

    expect(btnLocal).toBeDisabled();
    expect(btnEmpate).toBeDisabled();
    expect(btnVisitante).toBeDisabled();
  });

  it('si la API rechaza por ventana cerrada (409 PRONOSTICO_FUERA_DE_VENTANA) muestra el error', async () => {
    server.use(
      http.put(`${API_URL}/partidos/101/pronostico`, () => {
        return new HttpResponse(
          JSON.stringify({
            status: 409,
            codigo: 'PRONOSTICO_FUERA_DE_VENTANA',
            detail: 'La ventana para cargar o modificar el pronóstico ya cerró.',
            cierraEn: '2026-10-25T18:00:00Z',
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );

    const { user } = await renderRuta('/pronosticos');

    const card = await screen.findByTestId('partido-card-101');
    const btnLocal = within(card).getByRole('button', { name: /pronosticar victoria local/i });

    await user.click(btnLocal);

    // Debe mostrar la alerta con la explicación
    expect(await within(card).findByRole('alert')).toBeInTheDocument();
    expect(
      within(card).getByText(/la ventana para pronosticar cerró el 25\/10\/2026/i)
    ).toBeInTheDocument();
  });

  it('si la API rechaza por elección inválida (400) muestra el error correspondiente', async () => {
    server.use(
      http.put(`${API_URL}/partidos/101/pronostico`, () => {
        return new HttpResponse(
          JSON.stringify({
            status: 400,
            codigo: 'PRONOSTICO_INVALIDO',
            detail: 'El pronóstico indicado no es válido.',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );

    const { user } = await renderRuta('/pronosticos');

    const card = await screen.findByTestId('partido-card-101');
    const btnVisitante = within(card).getByRole('button', { name: /pronosticar victoria visitante/i });

    await user.click(btnVisitante);

    expect(await within(card).findByRole('alert')).toBeInTheDocument();
    expect(within(card).getByText(/el pronóstico indicado no es válido/i)).toBeInTheDocument();
  });

  it('al confirmar el resultado calcula el puntaje (3 puntos por acierto, 0 por desacierto)', async () => {
    await renderRuta('/pronosticos');

    // Partido 103: pronosticó '2' (visitante) y ganó visitante (2 - 3) -> +3 pts
    const cardAcierto = await screen.findByTestId('partido-card-103');
    expect(within(cardAcierto).getByText(/acertaste \(\+3 pts\)/i)).toBeInTheDocument();

    // Partido 104: pronosticó 'X' (empate) y ganó local (1 - 0) -> 0 pts
    const cardFallo = screen.getByTestId('partido-card-104');
    expect(within(cardFallo).getByText(/no acertaste \(0 pts\)/i)).toBeInTheDocument();
  });

  it('la pestaña de ranking muestra el podio y la tabla de posiciones con los participantes', async () => {
    const { user } = await renderRuta('/pronosticos');

    const tabRanking = await screen.findByRole('tab', { name: /tabla de posiciones \/ ranking/i });
    await user.click(tabRanking);

    // Podio y tabla
    const itemsPalermo = await screen.findAllByText('Martín Palermo');
    expect(itemsPalermo.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('27 pts')).toBeInTheDocument();

    const itemsLucas = screen.getAllByText('Lucas Gómez');
    expect(itemsLucas.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('18 pts')).toBeInTheDocument();

    // Tabla de clasificados
    const filaPalermo = screen.getByTestId('fila-ranking-10');
    expect(within(filaPalermo).getByText('1')).toBeInTheDocument();
    expect(within(filaPalermo).getByText('9 / 10')).toBeInTheDocument();
    expect(within(filaPalermo).getByText('90%')).toBeInTheDocument();

    // Resalta al usuario actual si está en la tabla
    const filaYo = screen.getByTestId('fila-ranking-2');
    expect(filaYo).toHaveClass('es-usuario-actual');
    expect(within(filaYo).getByText('Tú')).toBeInTheDocument();
  });

  it('permite filtrar por "Mis Pronósticos"', async () => {
    const { user } = await renderRuta('/pronosticos');

    const tabMisPronosticos = await screen.findByRole('tab', { name: /mis pronósticos/i });
    await user.click(tabMisPronosticos);

    // En el mock, partidos 102, 103, 104 tienen pronóstico propio
    expect(screen.getByTestId('partido-card-102')).toBeInTheDocument();
    expect(screen.getByTestId('partido-card-103')).toBeInTheDocument();
    expect(screen.getByTestId('partido-card-104')).toBeInTheDocument();

    // Partido 101 no tiene pronóstico propio, no debe figurar en esta pestaña
    expect(screen.queryByTestId('partido-card-101')).not.toBeInTheDocument();
  });

  it('permite filtrar por estado "Abiertos"', async () => {
    const { user } = await renderRuta('/pronosticos');

    const chipAbiertos = await screen.findByRole('button', { name: /^abiertos$/i });
    await user.click(chipAbiertos);

    // Partidos 101, 102, 201 están abiertos
    expect(screen.getByTestId('partido-card-101')).toBeInTheDocument();
    expect(screen.getByTestId('partido-card-102')).toBeInTheDocument();

    // Partido 103 está cerrado, no debe figurar
    expect(screen.queryByTestId('partido-card-103')).not.toBeInTheDocument();
  });

  it('permite filtrar por torneo en el dropdown', async () => {
    const { user } = await renderRuta('/pronosticos');

    const selectTorneo = await screen.findByLabelText(/torneo:/i);
    // Filtrar por Torneo Apertura Fútbol 7 (id 2)
    await user.selectOptions(selectTorneo, '2');

    // Deben mostrarse los partidos de torneo 2
    expect(await screen.findByText('La Banda FC')).toBeInTheDocument();
    expect(screen.getByText('Estrella Roja')).toBeInTheDocument();

    // Y no los del torneo 1
    expect(screen.queryByText('Los Leones FC')).not.toBeInTheDocument();
  });
});
