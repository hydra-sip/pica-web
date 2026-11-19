import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { prepararTorneoACancelar, TORNEO_A_CANCELAR } from '../mocks/cancelacionHandlers';
import { server } from '../mocks/server';
import { renderRuta } from '../test/renderRuta';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

/**
 * La consola del torneo con la inscripción abierta y {@code confirmadas} inscripciones confirmadas; el torneo pide 2
 * (`inscriptosMinimos`).
 */
const consolaCon = (confirmadas: number) => {
  const contarConfirmadas = vi.fn();
  prepararTorneoACancelar('INSCRIPCION_ABIERTA');
  server.use(
    http.get(`${API_URL}/torneos/opciones`, () => HttpResponse.json({ checkinDuracionMaxMin: 60 })),
    http.get(`${API_URL}/rifas/mis-rifas`, () =>
      HttpResponse.json({
        content: [],
        page: { size: 100, number: 0, totalElements: 0, totalPages: 0 },
      })
    ),
    http.get(`${API_URL}/torneos/${TORNEO_A_CANCELAR}/inscripciones`, ({ request }) => {
      const estado = new URL(request.url).searchParams.get('estado');
      if (estado === 'CONFIRMADA') contarConfirmadas();
      const total = estado === 'CONFIRMADA' ? confirmadas : confirmadas + 1;
      return HttpResponse.json({
        content: [],
        page: { size: 20, number: 0, totalElements: total, totalPages: total > 0 ? 1 : 0 },
      });
    })
  );
  renderRuta(`/torneos/${TORNEO_A_CANCELAR}/consola`, { usuario: 'organizador' });
  return contarConfirmadas;
};

describe('PICA-447: Cerrar la inscripción con el mínimo para jugar', () => {
  it('Por debajo del mínimo, «Cerrar inscripción» está deshabilitado con la leyenda', async () => {
    consolaCon(1);

    expect(
      await screen.findByText('Hacen falta al menos 2 inscripciones confirmadas')
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Cerrar inscripción' })).toBeDisabled();
  });

  it('En el mínimo, «Cerrar inscripción» está habilitado y sin la leyenda', async () => {
    const contarConfirmadas = consolaCon(2);

    const cerrar = await screen.findByRole('button', { name: 'Cerrar inscripción' });
    await waitFor(() => expect(contarConfirmadas).toHaveBeenCalled());
    expect(cerrar).toBeEnabled();
    expect(
      screen.queryByText('Hacen falta al menos 2 inscripciones confirmadas')
    ).not.toBeInTheDocument();
  });
});
