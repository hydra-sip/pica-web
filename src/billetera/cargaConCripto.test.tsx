import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { encodeErrorResult, encodeFunctionData } from 'viem';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '../mocks/server';
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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
const CONFIRMAR = `${API_URL}/billetera/cargas/cripto/:referencia/confirmar`;

const problema = (status: number, codigo: string, detail: string) =>
  HttpResponse.json({ status, codigo, detail }, { status });

/** `confirmar` responde `respuestas` en orden y, cuando se acaban, sigue con el handler de siempre. */
const confirmarResponde = (...respuestas: (() => Response)[]) => {
  const pedidos = { cantidad: 0 };
  server.use(
    http.post(CONFIRMAR, () => {
      const respuesta = respuestas[pedidos.cantidad++];
      return respuesta?.();
    })
  );
  return pedidos;
};

const pendiente = () =>
  problema(409, 'TRANSACCION_PENDIENTE', 'La transacción todavía no se confirmó');
const redCaida = () => problema(503, 'RED_NO_DISPONIBLE', 'El nodo no respondió');

/** Abre el modal, inicia la carga de $ 10.000 y la paga: deja la transacción enviada. */
const pagarDiezMil = async () => {
  const abierto = await abrirCargaConCripto();
  const { user, dialogo } = abierto;
  await user.type(await within(dialogo).findByLabelText(/Monto a cargar/i), '10000');
  await user.click(within(dialogo).getByRole('button', { name: 'Continuar' }));
  await user.click(await within(dialogo).findByRole('button', { name: 'Pagar con MetaMask' }));
  return abierto;
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

  describe('mientras el back espera las confirmaciones', () => {
    beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
    afterEach(() => vi.useRealTimers());

    it('una transacción todavía sin confirmar se reintenta a los 3 segundos y se acredita', async () => {
      const pedidos = confirmarResponde(pendiente);
      const { dialogo } = await pagarDiezMil();

      expect(await within(dialogo).findByText(/Confirmando/)).toBeInTheDocument();
      expect(within(dialogo).getByRole('link', { name: 'Ver en BaseScan' })).toBeInTheDocument();
      await waitFor(() => expect(pedidos.cantidad).toBe(1));

      await vi.advanceTimersByTimeAsync(3000);

      expect(await within(dialogo).findByText(/Acreditado: \$\s*10\.000,00/)).toBeInTheDocument();
      expect(pedidos.cantidad).toBe(2);
    });

    it('con el nodo del back caído también reintenta', async () => {
      const pedidos = confirmarResponde(redCaida, redCaida);
      const { dialogo } = await pagarDiezMil();

      await waitFor(() => expect(pedidos.cantidad).toBe(1));
      await vi.advanceTimersByTimeAsync(3000);
      await waitFor(() => expect(pedidos.cantidad).toBe(2));
      expect(within(dialogo).getByText(/Confirmando/)).toBeInTheDocument();
      await vi.advanceTimersByTimeAsync(3000);

      expect(await within(dialogo).findByText(/Acreditado/)).toBeInTheDocument();
    });

    it('a los dos minutos sin acreditarse avisa la demora, y Reintentar vuelve a esperar', async () => {
      const pedidos = confirmarResponde(...Array.from({ length: 41 }, () => pendiente));
      const { user, dialogo } = await pagarDiezMil();

      await waitFor(() => expect(pedidos.cantidad).toBe(1));
      await vi.advanceTimersByTimeAsync(120_000);

      expect(await within(dialogo).findByText(/Todavía no se confirmó/)).toBeInTheDocument();
      expect(within(dialogo).getByRole('link', { name: 'Ver en BaseScan' })).toBeInTheDocument();
      const hechos = pedidos.cantidad;
      await vi.advanceTimersByTimeAsync(30_000);
      expect(pedidos.cantidad).toBe(hechos); // ya no reintenta solo

      await user.click(within(dialogo).getByRole('button', { name: 'Reintentar' }));

      expect(await within(dialogo).findByText(/Acreditado/)).toBeInTheDocument();
    });

    it('si el back rechaza la transacción, muestra su mensaje y deja de reintentar', async () => {
      const pedidos = confirmarResponde(() =>
        problema(400, 'MONTO_NO_COINCIDE', 'La transacción no paga el monto de la carga')
      );
      const { dialogo } = await pagarDiezMil();

      expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
        'La transacción no paga el monto de la carga'
      );
      expect(within(dialogo).getByRole('link', { name: 'Ver en BaseScan' })).toBeInTheDocument();
      await vi.advanceTimersByTimeAsync(10_000);
      expect(pedidos.cantidad).toBe(1);
    });
  });

  describe('antes de que salga la transacción', () => {
    it('en otra red avisa y ofrece cambiar a Base Sepolia, y después deja seguir', async () => {
      conectarWalletDePrueba({ enOtraRed: true });
      const { user, dialogo } = await abrirCargaConCripto();

      expect(await within(dialogo).findByRole('alert')).toHaveTextContent('Estás en otra red');
      await user.type(within(dialogo).getByLabelText(/Monto a cargar/i), '10000');
      expect(within(dialogo).getByRole('button', { name: 'Continuar' })).toBeDisabled();

      await user.click(within(dialogo).getByRole('button', { name: 'Cambiar a Base Sepolia' }));

      await waitFor(() => expect(within(dialogo).queryByRole('alert')).not.toBeInTheDocument());
      await user.click(within(dialogo).getByRole('button', { name: 'Continuar' }));
      expect(await within(dialogo).findByText(/Vas a pagar/)).toBeInTheDocument();
    });

    it('sin ETH para el pago y el gas avisa antes de abrir la wallet y lleva al faucet', async () => {
      setCadenaMock({ saldoWei: 10n ** 13n }); // el pago es de 10^14 wei
      const { dialogo } = await pagarDiezMil();

      expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
        'No te alcanza para el pago y el gas'
      );
      expect(within(dialogo).getByRole('link', { name: /ETH de prueba/ })).toHaveAttribute(
        'href',
        expect.stringContaining('faucet')
      );
      expect(getTransaccionesEnviadas()).toHaveLength(0);
    });

    it('si la red rechaza el envío por falta de fondos, muestra el mismo aviso', async () => {
      setCadenaMock({
        errorAlEnviar: { code: -32000, message: 'insufficient funds for gas * price + value' },
      });
      const { dialogo } = await pagarDiezMil();

      expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
        'No te alcanza para el pago y el gas'
      );
    });

    it('con la firma rechazada avisa, y se puede volver a pagar la misma carga', async () => {
      setCadenaMock({ errorAlEnviar: { code: 4001, message: 'User rejected the request.' } });
      const { user, dialogo } = await pagarDiezMil();

      expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
        'Cancelaste el pago en la wallet'
      );

      setCadenaMock({ errorAlEnviar: null });
      await user.click(within(dialogo).getByRole('button', { name: 'Pagar con MetaMask' }));

      expect(await within(dialogo).findByText(/Acreditado/)).toBeInTheDocument();
      // pagó la referencia de la primera carga: no se inició otra
      expect(getTransaccionesEnviadas()[0].data.endsWith(PRIMERA_REFERENCIA.slice(2))).toBe(true);
    });
  });

  describe('con la transacción revertida', () => {
    const revierteCon = (errorName: 'EnforcedPause' | 'ReferenciaYaPagada') =>
      setCadenaMock({
        reciboExitoso: false,
        errorDelContrato: {
          code: 3,
          message: 'execution reverted',
          data:
            errorName === 'EnforcedPause'
              ? encodeErrorResult({
                  abi: [{ type: 'error', name: 'EnforcedPause', inputs: [] }],
                  errorName,
                })
              : encodeErrorResult({
                  abi: [
                    {
                      type: 'error',
                      name: 'ReferenciaYaPagada',
                      inputs: [{ name: 'referencia', type: 'bytes32' }],
                    },
                  ],
                  errorName,
                  args: [PRIMERA_REFERENCIA],
                }),
        },
      });

    it('dice por qué revirtió cuando el contrato lo explica, y no la manda a acreditar', async () => {
      revierteCon('EnforcedPause');
      const pedidos = confirmarResponde();
      const { dialogo } = await pagarDiezMil();

      expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
        'La pasarela está en pausa'
      );
      expect(within(dialogo).getByRole('link', { name: 'Ver en BaseScan' })).toBeInTheDocument();
      expect(pedidos.cantidad).toBe(0);
    });

    it('una carga ya pagada tiene su propio mensaje', async () => {
      revierteCon('ReferenciaYaPagada');
      const { dialogo } = await pagarDiezMil();

      expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
        'La carga ya está pagada'
      );
    });

    it('sin un motivo que se pueda leer, avisa que la transacción falló', async () => {
      setCadenaMock({ reciboExitoso: false });
      const { dialogo } = await pagarDiezMil();

      expect(await within(dialogo).findByRole('alert')).toHaveTextContent('La transacción falló');
      expect(within(dialogo).getByRole('link', { name: 'Ver en BaseScan' })).toBeInTheDocument();
    });
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
