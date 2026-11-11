import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderRuta } from '../test/renderRuta';
import { movimientosInicialesMock, setMovimientosMock } from '../mocks/data';

const HASH = '0x' + 'ab'.repeat(32);

describe('HU-609 / T609-4 (PICA-334): Cargar con cripto desde Mi billetera', () => {
  it('el movimiento de una carga con cripto enlaza a la transacción en BaseScan, y el resto no', async () => {
    setMovimientosMock([
      {
        ...movimientosInicialesMock[0],
        id: 201,
        referenciaExterna: HASH,
        descripcion: 'Carga de saldo con cripto',
        enlaceExplorador: `https://sepolia.basescan.org/tx/${HASH}`,
      },
      { ...movimientosInicialesMock[0], id: 202, descripcion: 'Carga de saldo simulada' },
    ]);

    await renderRuta('/billetera', { usuario: 'participante' });

    const conCripto = (await screen.findByText('Carga de saldo con cripto')).closest('tr')!;
    const enlace = within(conCripto).getByRole('link', { name: 'Ver en BaseScan' });
    expect(enlace).toHaveAttribute('href', `https://sepolia.basescan.org/tx/${HASH}`);
    expect(enlace).toHaveAttribute('target', '_blank');
    expect(enlace).toHaveAttribute('rel', 'noopener noreferrer');

    const simulada = screen.getByText('Carga de saldo simulada').closest('tr')!;
    expect(
      within(simulada).queryByRole('link', { name: 'Ver en BaseScan' })
    ).not.toBeInTheDocument();
  });
});
