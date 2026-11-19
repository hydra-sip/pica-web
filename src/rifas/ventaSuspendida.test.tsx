import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { RifaPublicaDetalle } from '../api/rifaApi';
import { problema } from '../mocks/adminHandlers';
import { server } from '../mocks/server';
import { renderRuta } from '../test/renderRuta';

// HU-703: mientras su organizador está bloqueado, la rifa en venta no vende

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const enUnaSemana = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

const rifa = (ventaSuspendida: boolean): RifaPublicaDetalle => ({
  id: 300,
  titulo: 'Rifa del Club',
  descripcion: null,
  estado: 'EN_VENTA',
  torneo: null,
  pctDestinadoTorneo: 0,
  numeroDesde: 1,
  numeroHasta: 20,
  precioNumero: 500,
  pctGastosAdministrativos: 10,
  moneda: 'ARS',
  ventaDesde: '2026-10-01T10:00:00Z',
  ventaHasta: enUnaSemana(),
  fechaSorteo: enUnaSemana(),
  premios: [{ puesto: 1, pct: 100, descripcion: 'Una bici', numeroGanador: null }],
  reparto: { recaudado: 0, alPozoTorneo: 0, aPremios: 0 },
  listaHash: null,
  listaSelladaEn: null,
  compromisoHash: null,
  compromisoPublicadoEn: null,
  ventaSuspendida,
});

const conRifa = (detalle: RifaPublicaDetalle) =>
  server.use(
    http.get(`${API_URL}/rifas/publicas/300`, () => HttpResponse.json(detalle)),
    http.get(`${API_URL}/rifas/publicas/300/numeros`, () => HttpResponse.json([]))
  );

describe('HU-703: la rifa de un organizador bloqueado', () => {
  it('avisa que la venta está suspendida y no deja elegir ni comprar', async () => {
    conRifa(rifa(true));
    await renderRuta('/rifas/300');

    expect(await screen.findByText('Venta suspendida')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Comprar' })).not.toBeInTheDocument();
    const grilla = screen.getByRole('list', { name: 'Números del 1 al 20' });
    expect(within(grilla).queryByRole('button', { name: '7: disponible' })).not.toBeInTheDocument();
  });

  it('si el organizador quedó bloqueado con la ficha abierta, comprar explica por qué no se puede', async () => {
    conRifa(rifa(false));
    server.use(
      http.post(`${API_URL}/rifas/300/reservas`, () =>
        problema(409, 'ORGANIZADOR_BLOQUEADO', 'El organizador de la rifa 300 está bloqueado')
      )
    );
    const { user } = await renderRuta('/rifas/300');

    await user.click(await screen.findByRole('button', { name: '7: disponible' }));
    await user.click(screen.getByRole('button', { name: 'Comprar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El organizador de la rifa está bloqueado: por ahora no se venden números.'
    );
  });
});
