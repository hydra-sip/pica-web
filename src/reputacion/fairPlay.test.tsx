import { render, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { FairPlayDetalle, MovimientoFairPlay } from '../api/fairPlayApi';
import { InscripcionDelTorneo } from '../api/torneoApi';
import { server } from '../mocks/server';
import { renderRuta } from '../test/renderRuta';
import { InscripcionesDelTorneo } from '../torneos/components/InscripcionesDelTorneo';
import { IndiceFairPlay, rangoFairPlay } from './components/IndiceFairPlay';
import { MiFairPlay } from './components/MiFairPlay';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const inscripto = (id: number, nombres: string, fairPlay: number): InscripcionDelTorneo => ({
  id,
  estado: 'CONFIRMADA',
  creadoEn: '2026-11-01T12:00:00Z',
  usuario: { id: id + 10, username: nombres.toLowerCase(), nombres, apellidos: 'Test' },
  equipo: null,
  capitan: null,
  jugadores: null,
  fairPlay,
  reputacion: { promedio: null, cantidad: 0 },
  noConfiable: false,
});

const movimiento = (cambios: Partial<MovimientoFairPlay>): MovimientoFairPlay => ({
  tipo: 'CHECKIN',
  delta: 1,
  valorResultante: 100,
  torneoId: 7,
  torneo: 'Apertura F5',
  partidoId: 40,
  sancionId: null,
  gravedad: null,
  creadoEn: '2026-11-10T18:00:00Z',
  ...cambios,
});

const conIndice = (indice: Partial<FairPlayDetalle>) =>
  server.use(
    http.get(`${API_URL}/usuarios/2/fair-play`, () =>
      HttpResponse.json({ usuarioId: 2, valor: 100, actualizadoEn: null, historial: [], ...indice })
    )
  );

describe('HU-802: el índice de fair play', () => {
  it('el color va por rango: verde de 80 para arriba, amarillo de 50 a 79 y rojo debajo', () => {
    expect([100, 80, 79, 50, 49, 0].map(rangoFairPlay)).toEqual([
      'alto',
      'alto',
      'medio',
      'medio',
      'bajo',
      'bajo',
    ]);
  });

  it('tiene un tooltip que explica cómo se calcula', () => {
    render(<IndiceFairPlay valor={72} />);

    expect(screen.getByLabelText('Fair play 72, medio')).toHaveClass('indice-medio');
    expect(
      screen.getByRole('button', { name: 'Cómo se calcula el fair play' })
    ).toHaveAccessibleDescription(
      /Arranca en 100.*check-in a tiempo.*ausencia sin aviso.*sanción.*Nunca baja de 0/
    );
  });

  it('el organizador ve el índice de cada inscripto', async () => {
    server.use(
      http.get(`${API_URL}/torneos/7/inscripciones`, () =>
        HttpResponse.json({
          content: [inscripto(1, 'Ana', 95), inscripto(2, 'Beto', 65), inscripto(3, 'Ciro', 30)],
          page: { size: 20, number: 0, totalElements: 3, totalPages: 1 },
        })
      )
    );
    render(
      <MemoryRouter>
        <InscripcionesDelTorneo torneoId={7} recarga={0} />
      </MemoryRouter>
    );

    const tabla = await screen.findByRole('table', { name: 'Inscripciones del torneo' });
    expect(within(tabla).getByRole('columnheader', { name: 'Fair play' })).toBeInTheDocument();
    const [, ana, beto, ciro] = within(tabla).getAllByRole('row');
    expect(within(ana).getByLabelText('Fair play 95, alto')).toHaveTextContent('95');
    expect(within(beto).getByLabelText('Fair play 65, medio')).toHaveClass('indice-medio');
    expect(within(ciro).getByLabelText('Fair play 30, bajo')).toHaveClass('indice-bajo');
  });
});

describe('HU-802: el índice en Mi perfil', () => {
  it('sin participaciones muestra el valor inicial y que todavía no se movió', async () => {
    conIndice({});
    render(
      <MemoryRouter>
        <MiFairPlay usuarioId={2} />
      </MemoryRouter>
    );

    const tarjeta = await screen.findByRole('region', { name: 'Índice de fair play' });
    expect(await within(tarjeta).findByLabelText('Fair play 100, alto')).toBeInTheDocument();
    expect(tarjeta).toHaveTextContent('0 sanciones · 0 check-ins cumplidos');
    expect(tarjeta).toHaveTextContent('Todavía no se movió');
  });

  it('muestra el historial de lo que lo movió, el último primero', async () => {
    conIndice({
      valor: 61,
      actualizadoEn: '2026-11-15T18:00:00Z',
      historial: [
        movimiento({
          tipo: 'SANCION',
          delta: -30,
          valorResultante: 61,
          partidoId: null,
          sancionId: 4,
          gravedad: 'GRAVE',
          creadoEn: '2026-11-15T18:00:00Z',
        }),
        movimiento({ tipo: 'CHECKIN', delta: 1, valorResultante: 91 }),
        movimiento({ tipo: 'AUSENCIA', delta: -10, valorResultante: 90 }),
        movimiento({ tipo: 'CHECKIN', delta: 0, valorResultante: 100 }),
      ],
    });
    render(
      <MemoryRouter>
        <MiFairPlay usuarioId={2} />
      </MemoryRouter>
    );

    const tarjeta = await screen.findByRole('region', { name: 'Índice de fair play' });
    expect(await within(tarjeta).findByLabelText('Fair play 61, medio')).toBeInTheDocument();
    expect(tarjeta).toHaveTextContent('1 sanción · 2 check-ins cumplidos');
    const filas = within(
      within(tarjeta).getByRole('table', { name: 'Historial del índice de fair play' })
    ).getAllByRole('row');
    expect(
      filas.slice(1).map((f) =>
        within(f)
          .getAllByRole('cell')
          .slice(1)
          .map((c) => c.textContent)
      )
    ).toEqual([
      ['Sanción graveApertura F5', '−30', '61'],
      ['Check-in cumplidoApertura F5 · Ver el partido', '+1', '91'],
      ['Ausencia sin avisoApertura F5 · Ver el partido', '−10', '90'],
      ['Check-in cumplidoApertura F5 · Ver el partido', '0', '100'],
    ]);
    expect(within(filas[2]).getByRole('link', { name: 'Ver el partido' })).toHaveAttribute(
      'href',
      '/partidos/40'
    );
  });

  it('Mi perfil muestra el índice y las sanciones de quien entra', async () => {
    await renderRuta('/mi-perfil');

    expect(await screen.findByRole('region', { name: 'Índice de fair play' })).toBeInTheDocument();
    expect(await screen.findByRole('region', { name: 'Mis sanciones' })).toHaveTextContent(
      'No tenés sanciones.'
    );
  });
});
