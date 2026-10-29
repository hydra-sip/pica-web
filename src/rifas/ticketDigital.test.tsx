import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { renderRuta } from '../test/renderRuta';
import { PagoRifa } from './components/PagoRifa';

describe('HU-404 / T404-2: Ticket digital', () => {
  it('Criterio 1: Consultar el ticket de una venta no confirmada y comprobar que no está disponible', async () => {
    await renderRuta('/tickets/9999');

    expect(await screen.findByRole('alert')).toHaveTextContent('El ticket no existe o no es tuyo.');
  });

  it('Criterio 2: Confirmar una venta y comprobar que se puede ir al ticket generado', () => {
    render(
      <MemoryRouter>
        <PagoRifa
          reserva={null}
          compra={{
            ticketId: 5,
            ticketCodigo: 'R1-4F2K9Q',
            numeros: [7, 8],
            monto: 1000,
            gastosAdministrativos: 100,
            total: 1100,
            compradoEn: '2026-10-29T12:00:00Z',
            pozoRifa: 1000,
            pozoTorneo: null,
          }}
          pagando={false}
          error={null}
          onPagar={() => {}}
          onCancelar={() => {}}
          onCerrar={() => {}}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('R1-4F2K9Q')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver mi ticket' })).toHaveAttribute(
      'href',
      '/tickets/5'
    );
  });

  it('Criterio 3: Descargar el ticket y comprobar que los datos coinciden con la compra', async () => {
    // Ticket 1001: números 14, 25 y 42, $3000 de números y $150 de gastos
    const imprimir = vi.spyOn(window, 'print').mockImplementation(() => {});
    const { user } = await renderRuta('/tickets/1001');

    await screen.findByText('Gran Rifa Benéfica de la Copa');
    expect(screen.getByText('SEED-0001')).toBeInTheDocument();
    expect(screen.getByText('#14')).toBeInTheDocument();
    expect(screen.getByText('#42')).toBeInTheDocument();
    expect(screen.getByTestId('ticket-total')).toHaveTextContent('3.150,00');

    await user.click(screen.getByRole('button', { name: 'Descargar comprobante' }));
    expect(imprimir).toHaveBeenCalledOnce();
    imprimir.mockRestore();
  });

  it('Sin sesión, el ticket lleva al login', async () => {
    const { ubicacion } = await renderRuta('/tickets/1001', { usuario: 'anonimo' });

    await vi.waitFor(() => expect(ubicacion()).toBe('/auth/login'));
  });

  it('Mis tickets muestra el total pagado de cada uno', async () => {
    await renderRuta('/mis-tickets');

    expect(await screen.findByText('SEED-0001')).toBeInTheDocument();
    expect(screen.getByText(/Pagaste: .*3.150,00/)).toBeInTheDocument();
  });
});
