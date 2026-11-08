import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ReservaRifa } from '../api/rifaApi';
import { setBilleteraMock } from '../mocks/data';
import { PagoRifa } from '../rifas/components/PagoRifa';
import { CustodiaDelEvento } from './components/CustodiaDelEvento';

// Dos números a $500 más 10 % de gastos
const reserva: ReservaRifa = {
  rifaId: 200,
  numeros: [7, 8],
  precioNumero: 500,
  monto: 1000,
  pctGastosAdministrativos: 10,
  gastosAdministrativos: 100,
  total: 1100,
  venceEn: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
};

const pagoRifa = (onPagar = vi.fn()) =>
  render(
    <MemoryRouter>
      <PagoRifa
        rifaTitulo="Gran Rifa Copa Primavera"
        reserva={reserva}
        compra={null}
        pagando={false}
        error={null}
        onPagar={onPagar}
        onCancelar={() => {}}
        onCerrar={() => {}}
      />
    </MemoryRouter>
  );

describe('HU-603: compra de números con saldo', () => {
  it('sin saldo no deja pagar, y al cargar lo que falta paga con los mismos números reservados', async () => {
    setBilleteraMock({ saldoDisponible: 500 });
    const user = userEvent.setup();
    const onPagar = vi.fn();
    pagoRifa(onPagar);

    expect(await screen.findByText('No alcanza')).toBeInTheDocument();
    expect(screen.getByText(/Te faltan/)).toHaveTextContent(
      /Te faltan \$\s600,00 para pagar \$\s1\.100,00/
    );
    const pagar = screen.getByRole('button', { name: /pagar .*1\.100,00 con saldo/i });
    expect(pagar).toBeDisabled();
    expect(screen.queryByText(/Pago simulado/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cargar saldo' }));

    expect(await screen.findByText(/Saldo disponible: \$\s1\.100,00/)).toBeInTheDocument();
    expect(pagar).toBeEnabled();
    expect(screen.getByText('7, 8', { exact: false })).toBeInTheDocument();
    await user.click(pagar);
    expect(onPagar).toHaveBeenCalledOnce();
  });

  it('un error al cargar se muestra en el campo y no deja pagar', async () => {
    setBilleteraMock({ saldoDisponible: 500, estado: 'BLOQUEADA' });
    const user = userEvent.setup();
    pagoRifa();
    await screen.findByText('No alcanza');

    await user.click(screen.getByRole('button', { name: 'Cargar saldo' }));

    expect(await screen.findByText(/Tu billetera está bloqueada/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pagar .* con saldo/i })).toBeDisabled();
  });
});

describe('HU-603: la custodia para el organizador', () => {
  it('muestra lo retenido y no deja retirar los fondos antes del cierre', async () => {
    const user = userEvent.setup();
    render(<CustodiaDelEvento evento="torneos" id={7} />);

    const custodia = await screen.findByRole('region', { name: 'Fondos en custodia' });
    expect(within(custodia).getByText('En custodia')).toBeInTheDocument();
    expect(within(custodia).getByText('Total retenido').nextSibling).toHaveTextContent('22.000,00');
    expect(within(custodia).getByText('Inscripciones').nextSibling).toHaveTextContent('20.000,00');
    expect(
      within(custodia).getByText(/Nadie puede mover estos fondos hasta que termine el torneo/)
    ).toBeInTheDocument();

    await user.click(within(custodia).getByRole('button', { name: 'Retirar fondos' }));

    expect(await within(custodia).findByRole('alert')).toHaveTextContent(
      'Los fondos están en custodia y no se pueden mover hasta que termine el evento'
    );
  });
});
