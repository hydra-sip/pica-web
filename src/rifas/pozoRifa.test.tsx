import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { RifaDetalle } from '../api/rifaApi';
import { server } from '../mocks/server';
import { RifaDelTorneo } from '../torneos/components/RifaDelTorneo';
import { PagoRifa } from './components/PagoRifa';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const rifa: RifaDetalle = {
  id: 200,
  titulo: 'Gran Rifa Copa Primavera',
  descripcion: null,
  torneoId: 100,
  torneoNombre: 'Copa Primavera',
  estado: 'EN_VENTA',
  numeroDesde: 1,
  numeroHasta: 100,
  precioNumero: 500,
  moneda: 'ARS',
  ventaDesde: '2026-10-15T10:00:00Z',
  ventaHasta: '2026-11-01T12:00:00Z',
  fechaSorteo: '2026-11-01T18:00:00Z',
  pctDestinadoTorneo: 50,
  terminosAceptadosEn: null,
  loteriaDeclaradaEn: null,
  premios: [{ puesto: 1, pct: 100, descripcion: 'Smart TV', numeroGanador: null }],
  numerosVendidos: 0,
  reparto: { recaudado: 0, alPozoTorneo: 0, aPremios: 0 },
  listaHash: null,
  listaSelladaEn: null,
  compromisoHash: null,
  compromisoPublicadoEn: null,
  creadoEn: '2026-10-15T10:00:00Z',
  modificadoEn: null,
};

/** Mis rifas con la del torneo 100, y su detalle como lo devuelve GET /rifas/{id}. */
const conRifa = (detalle: RifaDetalle) =>
  server.use(
    http.get(`${API_URL}/rifas/mis-rifas`, () =>
      HttpResponse.json({
        content: [detalle],
        page: { size: 100, number: 0, totalElements: 1, totalPages: 1 },
      })
    ),
    http.get(`${API_URL}/rifas/200`, () => HttpResponse.json(detalle))
  );

const renderConsola = () =>
  render(
    <MemoryRouter>
      <RifaDelTorneo torneoId={100} />
    </MemoryRouter>
  );

describe('HU-406 / T406-1: Pozo de la rifa y avance de la venta', () => {
  it('Una rifa sin ventas muestra los vendidos y el pozo en cero en la consola del torneo', async () => {
    conRifa(rifa);
    renderConsola();

    expect(await screen.findByText('Rifa: Gran Rifa Copa Primavera')).toBeInTheDocument();
    expect(screen.getByText('0 de 100')).toBeInTheDocument();
    expect(screen.getByText('Recaudado').nextSibling).toHaveTextContent('0,00');
    expect(
      screen.getByText('Al pozo del torneo Copa Primavera (50%)').nextSibling
    ).toHaveTextContent('0,00');
    expect(screen.getByText('A premios (50%)').nextSibling).toHaveTextContent('0,00');
    expect(screen.getByRole('link', { name: 'Ver rifa' })).toHaveAttribute(
      'href',
      '/rifas/200/editar'
    );
  });

  it('Con ventas registradas, el pozo se desglosa entre el torneo y los premios', async () => {
    conRifa({
      ...rifa,
      numerosVendidos: 6,
      reparto: { recaudado: 3000, alPozoTorneo: 1500, aPremios: 1500 },
    });
    renderConsola();

    expect(await screen.findByText('6 de 100')).toBeInTheDocument();
    expect(screen.getByText('Recaudado').nextSibling).toHaveTextContent('3.000,00');
    expect(
      screen.getByText('Al pozo del torneo Copa Primavera (50%)').nextSibling
    ).toHaveTextContent('1.500,00');
    expect(screen.getByText('A premios (50%)').nextSibling).toHaveTextContent('1.500,00');
  });

  it('Un torneo sin rifa no muestra la card', async () => {
    let pedidas = 0;
    server.use(
      http.get(`${API_URL}/rifas/mis-rifas`, () => {
        pedidas++;
        return HttpResponse.json({
          content: [],
          page: { size: 100, number: 0, totalElements: 0, totalPages: 0 },
        });
      })
    );
    renderConsola();

    await vi.waitFor(() => expect(pedidas).toBe(1));
    expect(screen.queryByTestId('rifa-recaudado')).not.toBeInTheDocument();
  });

  it('El pago de la compra muestra el resumen y confirma con el total, como la inscripción', async () => {
    const user = userEvent.setup();
    const onPagar = vi.fn();
    render(
      <MemoryRouter>
        <PagoRifa
          rifaTitulo="Gran Rifa Copa Primavera"
          reserva={{
            rifaId: 200,
            numeros: [7, 8],
            precioNumero: 500,
            monto: 1000,
            pctGastosAdministrativos: 10,
            gastosAdministrativos: 100,
            total: 1100,
            venceEn: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          }}
          compra={null}
          pagando={false}
          error={null}
          onPagar={onPagar}
          onCancelar={() => {}}
          onCerrar={() => {}}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Resumen de compra')).toBeInTheDocument();
    expect(screen.getByText('Gastos administrativos').nextSibling).toHaveTextContent('100,00');
    expect(screen.getByText('Total a pagar').nextSibling).toHaveTextContent('1.100,00');
    expect(screen.getByText('Garantía de fondos en custodia')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /confirmar pago de .*1\.100,00/i }));
    expect(onPagar).toHaveBeenCalledOnce();
  });
});
