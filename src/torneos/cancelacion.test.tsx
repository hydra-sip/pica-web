import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { MisTorneos } from '../api/torneoApi';
import { server } from '../mocks/server';
import { renderRuta } from '../test/renderRuta';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const misTorneosEnRevision: MisTorneos = {
  content: [
    {
      id: 7,
      nombre: 'Apertura F5',
      disciplina: 'Fútbol 5',
      estado: 'CANCELACION_EN_REVISION',
      pasoPendiente: null,
      sede: 'Club Mercedes',
      cupoMaximo: 16,
      inscriptos: 3,
      pozo: 3000,
      pozoEstimado: false,
      moneda: 'ARS',
      fechaInicio: '2026-12-01T15:00:00Z',
      modificadoEn: '2026-11-10T12:00:00Z',
    },
  ],
  page: { number: 0, size: 20, totalElements: 1, totalPages: 1 },
  porEstado: {
    BORRADOR: 0,
    INSCRIPCION_ABIERTA: 0,
    INSCRIPCION_CERRADA: 0,
    EN_CURSO: 0,
    FINALIZADO: 0,
    CANCELACION_EN_REVISION: 1,
    CANCELADO: 0,
  },
  disciplinas: ['Fútbol 5'],
};

describe('Cancelación de torneos (HU-605)', () => {
  it('Mis torneos muestra «Cancelación en revisión» en la tarjeta y en su pestaña', async () => {
    server.use(
      http.get(`${API_URL}/torneos/mis-torneos`, () => HttpResponse.json(misTorneosEnRevision))
    );

    await renderRuta('/mis-torneos', { usuario: 'organizador' });

    expect(
      await screen.findByRole('button', { name: 'Cancelación en revisión (1)' })
    ).toBeInTheDocument();
    expect(screen.getAllByText('Cancelación en revisión').length).toBeGreaterThan(0);
  });
});
