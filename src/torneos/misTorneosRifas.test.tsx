import { render, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MiTorneoResumen } from '../api/torneoApi';
import { server } from '../mocks/server';
import { MisTorneosPage } from './pages/MisTorneosPage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const torneo = (id: number, nombre: string): MiTorneoResumen => ({
  id,
  nombre,
  disciplina: 'Fútbol 5',
  estado: 'INSCRIPCION_ABIERTA',
  pasoPendiente: null,
  sede: null,
  cupoMaximo: 8,
  inscriptos: 0,
  pozo: null,
  pozoEstimado: false,
  moneda: 'ARS',
  fechaInicio: '2026-12-01T18:00:00Z',
  modificadoEn: '2026-11-01T10:00:00Z',
});

describe('CR-06: Mis torneos con varias rifas por torneo', () => {
  it('Ofrece crear otra rifa aunque el torneo ya tenga, y con varias lleva a Mis rifas', async () => {
    server.use(
      http.get(`${API_URL}/torneos/mis-torneos`, () =>
        HttpResponse.json({
          content: [torneo(1, 'Sin rifas'), torneo(2, 'Con una rifa'), torneo(3, 'Con dos rifas')],
          page: { size: 20, number: 0, totalElements: 3, totalPages: 1 },
          porEstado: { INSCRIPCION_ABIERTA: 3 },
          disciplinas: ['Fútbol 5'],
        })
      ),
      http.get(`${API_URL}/rifas/mis-rifas`, () =>
        HttpResponse.json({
          content: [
            { id: 20, torneoId: 2 },
            { id: 30, torneoId: 3 },
            { id: 31, torneoId: 3 },
          ],
          page: { size: 100, number: 0, totalElements: 3, totalPages: 1 },
        })
      )
    );
    render(
      <MemoryRouter>
        <MisTorneosPage />
      </MemoryRouter>
    );

    const fila = async (nombre: string) => within((await screen.findByText(nombre)).closest('tr')!);

    const sinRifas = await fila('Sin rifas');
    expect(await sinRifas.findByRole('link', { name: 'Crear rifa' })).toHaveAttribute(
      'href',
      '/rifas/nueva?torneo=1'
    );
    expect(sinRifas.queryByRole('link', { name: /Ver rifa/ })).not.toBeInTheDocument();

    const conUna = await fila('Con una rifa');
    expect(conUna.getByRole('link', { name: 'Ver rifa' })).toHaveAttribute(
      'href',
      '/rifas/20/editar'
    );
    expect(conUna.getByRole('link', { name: 'Crear rifa' })).toBeInTheDocument();

    const conDos = await fila('Con dos rifas');
    expect(conDos.getByRole('link', { name: 'Ver rifas' })).toHaveAttribute('href', '/mis-rifas');
    expect(conDos.getByRole('link', { name: 'Crear rifa' })).toBeInTheDocument();
  });
});
