import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { RifaDetalle } from '../api/rifaApi';
import { server } from '../mocks/server';
import { RifaFormPage } from './pages/RifaFormPage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const enVenta = (numerosVendidos: number): RifaDetalle => ({
  id: 300,
  titulo: 'Rifa del club',
  descripcion: null,
  torneoId: null,
  torneoNombre: null,
  estado: 'EN_VENTA',
  numeroDesde: 1,
  numeroHasta: 100,
  precioNumero: 500,
  moneda: 'ARS',
  ventaDesde: '2026-10-15T10:00:00Z',
  ventaHasta: '2030-11-01T12:00:00Z',
  fechaSorteo: '2030-11-01T18:00:00Z',
  pctDestinadoTorneo: 0,
  terminosAceptadosEn: '2026-10-15T10:00:00Z',
  loteriaDeclaradaEn: null,
  premios: [{ puesto: 1, pct: 100, descripcion: 'Smart TV', numeroGanador: null }],
  numerosVendidos,
  reparto: { recaudado: numerosVendidos * 500, alPozoTorneo: 0, aPremios: numerosVendidos * 500 },
  listaHash: null,
  listaSelladaEn: null,
  compromisoHash: null,
  compromisoPublicadoEn: null,
  creadoEn: '2026-10-15T10:00:00Z',
  modificadoEn: null,
});

const abrir = async (rifa: RifaDetalle) => {
  server.use(http.get(`${API_URL}/rifas/300`, () => HttpResponse.json(rifa)));
  render(
    <MemoryRouter initialEntries={['/rifas/300/editar']}>
      <Routes>
        <Route path="/rifas/:id/editar" element={<RifaFormPage />} />
      </Routes>
    </MemoryRouter>
  );
  await screen.findByRole('heading', { name: 'Rifa del club', level: 1 });
};

describe('PICA-445: Cerrar la venta sin números vendidos', () => {
  it('Sin vendidos, «Cerrar venta» está deshabilitado y dice por qué', async () => {
    await abrir(enVenta(0));

    expect(screen.getByRole('button', { name: 'Cerrar venta' })).toBeDisabled();
    expect(screen.getByText('Todavía no se vendió ningún número')).toBeVisible();
  });

  it('Con un número vendido, «Cerrar venta» está habilitado y sin la leyenda', async () => {
    await abrir(enVenta(1));

    expect(screen.getByRole('button', { name: 'Cerrar venta' })).toBeEnabled();
    expect(screen.queryByText('Todavía no se vendió ningún número')).not.toBeInTheDocument();
  });

  it('Si el back responde RIFA_SIN_VENTAS, se muestra el mensaje', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${API_URL}/rifas/300/cerrar-venta`, () =>
        HttpResponse.json(
          { status: 409, codigo: 'RIFA_SIN_VENTAS', detail: 'La rifa 300 no vendió ningún número' },
          { status: 409 }
        )
      )
    );
    // la pantalla quedó con un vendido que ya no está (por ejemplo, se anuló la compra)
    await abrir(enVenta(1));

    await user.click(screen.getByRole('button', { name: 'Cerrar venta' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Cerrar venta' })
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Todavía no se vendió ningún número: la venta no se puede cerrar.'
    );
  });
});
