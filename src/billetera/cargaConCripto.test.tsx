import { screen, waitFor, within } from '@testing-library/react';
import { encodeFunctionData } from 'viem';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderRuta } from '../test/renderRuta';
import { conectarWalletDePrueba } from '../test/wallet';
import {
  CONTRATO_PASARELA,
  movimientosInicialesMock,
  setBilleteraMock,
  setMovimientosMock,
} from '../mocks/data';
import { getTransaccionesEnviadas, HASH_ENVIADO, setCadenaMock } from '../mocks/cadenaHandlers';
import { usarConfigWallet } from './cripto/configWallet';

const HASH = '0x' + 'ab'.repeat(32);
const PRIMERA_REFERENCIA = `0x${'1'.padStart(64, '0')}` as const;

/** Una promesa que el test resuelve cuando quiere: deja "abierto" un paso para ver el estado intermedio. */
const pausa = () => {
  let seguir!: () => void;
  const promesa = new Promise<void>((resolve) => (seguir = resolve));
  return { promesa, seguir };
};

const abrirCargaConCripto = async () => {
  const resultado = await renderRuta('/billetera', { usuario: 'participante' });
  await resultado.user.click(await screen.findByRole('button', { name: 'Cargar con cripto' }));
  const dialogo = await screen.findByRole('dialog', { name: 'Cargar con cripto' });
  return { ...resultado, dialogo };
};

describe('HU-609 / T609-4 (PICA-334): Cargar con cripto desde Mi billetera', () => {
  beforeEach(() => conectarWalletDePrueba());
  afterEach(() => usarConfigWallet(undefined));

  it('carga saldo con la wallet: ve cuánto ETH paga, firma, se confirma y el saldo sube', async () => {
    const firma = pausa();
    setCadenaMock({ firma: firma.promesa });
    const { user, dialogo } = await abrirCargaConCripto();

    await user.type(await within(dialogo).findByLabelText(/Monto a cargar/i), '10000');
    await user.click(within(dialogo).getByRole('button', { name: 'Continuar' }));

    expect(
      await within(dialogo).findByText(/Vas a pagar 0,0001 ETH por \$\s*10\.000,00/)
    ).toBeInTheDocument();
    await user.click(within(dialogo).getByRole('button', { name: 'Pagar con MetaMask' }));

    expect(await within(dialogo).findByText(/Firmando/)).toBeInTheDocument();
    firma.seguir();

    expect(await within(dialogo).findByText(/Acreditado: \$\s*10\.000,00/)).toBeInTheDocument();
    expect(within(dialogo).getByRole('link', { name: 'Ver en BaseScan' })).toHaveAttribute(
      'href',
      `https://sepolia.basescan.org/tx/${HASH_ENVIADO}`
    );

    // la transacción paga la referencia que dio el back, en su contrato y por sus wei
    const [enviada] = getTransaccionesEnviadas();
    expect(enviada.to.toLowerCase()).toBe(CONTRATO_PASARELA.toLowerCase());
    expect(BigInt(enviada.value)).toBe(100_000_000_000_000n);
    expect(enviada.data).toBe(
      encodeFunctionData({
        abi: [
          {
            type: 'function',
            name: 'cargar',
            inputs: [{ name: 'referencia', type: 'bytes32' }],
            outputs: [],
            stateMutability: 'payable',
          },
        ],
        functionName: 'cargar',
        args: [PRIMERA_REFERENCIA],
      })
    );

    // el saldo sube sin recargar: $ 15.000 + $ 10.000
    await waitFor(() =>
      expect(
        within(screen.getByTestId('indicadores-saldo')).getByText(/\$\s*25\.000,00/)
      ).toBeInTheDocument()
    );
  });

  it('no deja seguir con un monto que el back rechazaría', async () => {
    const { user, dialogo } = await abrirCargaConCripto();

    await user.type(await within(dialogo).findByLabelText(/Monto a cargar/i), '10,555');
    await user.click(within(dialogo).getByRole('button', { name: 'Continuar' }));

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
      'El monto debe tener como máximo 2 decimales'
    );
    expect(within(dialogo).queryByText(/Vas a pagar/)).not.toBeInTheDocument();
  });

  it('con la billetera bloqueada, Cargar con cripto aparece deshabilitado', async () => {
    setBilleteraMock({ estado: 'BLOQUEADA' });

    await renderRuta('/billetera', { usuario: 'participante' });

    expect(
      await screen.findByText(/Tu billetera está bloqueada temporalmente/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cargar con cripto' })).toBeDisabled();
  });

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
