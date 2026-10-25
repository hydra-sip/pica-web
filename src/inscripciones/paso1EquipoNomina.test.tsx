import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen } from '@testing-library/react';
import { equipoApi } from '../api/equipoApi';
import { server } from '../mocks/server';
import { renderRuta } from '../test/renderRuta';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

// Los equipos del capitán de los mocks, por nombre (hay que estar logueado, ver renderRuta).
const idDeEquipo = async (nombre: string) =>
  (await equipoApi.listarMios()).content.find((e) => e.nombre === nombre)!.id;

const ALTA_F5 = '/torneos/torneo-apertura-f5/inscripcion';

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
});
