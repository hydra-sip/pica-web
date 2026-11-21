import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { encodeErrorResult, encodeFunctionData } from 'viem';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { server } from '../mocks/server';
import { renderRuta } from '../test/renderRuta';
import { conectarWalletDePrueba } from '../test/wallet';
import {
  agregarRetiroCriptoMock,
  CONTRATO_RETIROS,
  getMovimientosMock,
  setBilleteraMock,
} from '../mocks/data';
import {
  CUENTA_DE_PRUEBA,
  getTransaccionesEnviadas,
  HASH_ENVIADO,
  setCadenaMock,
} from '../mocks/cadenaHandlers';
import type { RetiroCripto } from '../api/billeteraApi';
import { usarConfigWallet } from './cripto/configWallet';
import { pasarelaRetirosAbi } from './cripto/pasarelaRetiros';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const abrirRetiro = async () => {
  const resultado = await renderRuta('/billetera', { usuario: 'participante' });
  await resultado.user.click(await screen.findByRole('button', { name: 'Retirar a la wallet' }));
  const dialogo = await screen.findByRole('dialog', { name: 'Retirar a la wallet' });
  return { ...resultado, dialogo };
};

/** Abre el modal y pide un retiro de $ 10.000: el saldo ya se descontó y queda el permiso para cobrar. */
const pedirDiezMil = async () => {
  const abierto = await abrirRetiro();
  const { user, dialogo } = abierto;
  await user.type(await within(dialogo).findByLabelText(/Monto a retirar/i), '10000');
  await user.click(within(dialogo).getByRole('button', { name: 'Continuar' }));
  await within(dialogo).findByText(/Vas a recibir/);
  return abierto;
};

const cobrarDiezMil = async () => {
  const abierto = await pedirDiezMil();
  await abierto.user.click(
    within(abierto.dialogo).getByRole('button', { name: 'Cobrar con MetaMask' })
  );
  return abierto;
};

const saldoDisponible = () => within(screen.getByTestId('indicadores-saldo'));

/** Un permiso pedido antes, para otra wallet o vencido. */
const permiso = (cambios: Partial<RetiroCripto> = {}): RetiroCripto => {
  const vence = Math.floor(Date.now() / 1000) + 1800;
  return {
    referencia: `0x${'e'.repeat(64)}`,
    contrato: CONTRATO_RETIROS,
    chainId: 84532,
    destino: CUENTA_DE_PRUEBA,
    montoPesos: 2000,
    montoWei: '20000000000000',
    vence,
    venceEn: new Date(vence * 1000).toISOString(),
    firma: `0x${'5a'.repeat(65)}`,
    estado: 'PENDIENTE',
    ...cambios,
  };
};

describe('HU-610 / T610-3 (PICA-456): Retirar a la wallet desde Mi billetera', () => {
  beforeEach(() => conectarWalletDePrueba());
  afterEach(() => usarConfigWallet(undefined));

  it('retira a la wallet conectada: el saldo baja al pedirlo, cobra en el contrato y queda confirmado', async () => {
    setBilleteraMock({ saldoRetenido: 1234 });
    const { user, dialogo } = await abrirRetiro();

    await user.type(await within(dialogo).findByLabelText(/Monto a retirar/i), '10000');
    await user.click(within(dialogo).getByRole('button', { name: 'Continuar' }));

    expect(
      await within(dialogo).findByText(
        /Vas a recibir 0,0001 ETH por \$\s*10\.000,00 en 0x1111…1111/
      )
    ).toBeInTheDocument();
    // el back ya lo descontó: $ 15.000 - $ 10.000
    await waitFor(() => expect(saldoDisponible().getByText(/\$\s*5\.000,00/)).toBeInTheDocument());

    await user.click(within(dialogo).getByRole('button', { name: 'Cobrar con MetaMask' }));

    expect(
      await within(dialogo).findByText(/Cobrado: 0,0001 ETH en tu wallet/)
    ).toBeInTheDocument();
    expect(within(dialogo).getByRole('link', { name: 'Ver en BaseScan' })).toHaveAttribute(
      'href',
      `https://sepolia.basescan.org/tx/${HASH_ENVIADO}`
    );

    // la transacción cobra el permiso del back en su contrato, sin mandar ETH
    const [enviada] = getTransaccionesEnviadas();
    expect(enviada.from.toLowerCase()).toBe(CUENTA_DE_PRUEBA);
    expect(enviada.to.toLowerCase()).toBe(CONTRATO_RETIROS.toLowerCase());
    expect(BigInt(enviada.value ?? '0x0')).toBe(0n);
    const [pedido] = getMovimientosMock();
    expect(pedido).toMatchObject({
      tipo: 'RETIRO',
      estado: 'CONFIRMADO',
      referenciaExterna: HASH_ENVIADO,
    });
    expect(enviada.data.slice(0, 10)).toBe(
      encodeFunctionData({
        abi: pasarelaRetirosAbi,
        functionName: 'cobrar',
        args: [`0x${'0'.repeat(63)}1`, 1n, 1n, '0x'],
      }).slice(0, 10)
    );
    expect(await screen.findByText(/Cobraste \$\s*10\.000,00 en tu wallet/)).toBeInTheDocument();
  });

  it('le pide al back el retiro para la wallet conectada', async () => {
    let cuerpo: unknown;
    server.use(
      http.post(`${API_URL}/billetera/retiros/cripto`, async ({ request }) => {
        cuerpo = await request.clone().json();
        return undefined;
      })
    );

    await pedirDiezMil();

    expect(cuerpo).toEqual({ monto: 10000, destino: CUENTA_DE_PRUEBA });
  });

  describe('antes de pedirlo', () => {
    it('no deja pedir un monto fuera de los topes o mayor al saldo', async () => {
      let pedidos = 0;
      server.use(
        http.post(`${API_URL}/billetera/retiros/cripto`, () => {
          pedidos++;
          return undefined;
        })
      );
      const { user, dialogo } = await abrirRetiro();
      const monto = await within(dialogo).findByLabelText(/Monto a retirar/i);
      const continuar = within(dialogo).getByRole('button', { name: 'Continuar' });

      await user.type(monto, '999');
      await user.click(continuar);
      expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
        /El mínimo para retirar es \$\s*1\.000,00/
      );

      await user.clear(monto);
      await user.type(monto, '15000,01');
      await user.click(continuar);
      expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
        'El monto supera tu saldo disponible'
      );
      expect(pedidos).toBe(0);
    });

    it('si el back lo rechaza, muestra su mensaje y no descuenta nada', async () => {
      server.use(
        http.post(`${API_URL}/billetera/retiros/cripto`, () =>
          HttpResponse.json(
            { status: 503, codigo: 'RETIROS_CRIPTO_NO_DISPONIBLES', detail: 'sin firmante' },
            { status: 503 }
          )
        )
      );
      const { user, dialogo } = await abrirRetiro();

      await user.type(await within(dialogo).findByLabelText(/Monto a retirar/i), '10000');
      await user.click(within(dialogo).getByRole('button', { name: 'Continuar' }));

      expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
        'Los retiros a la wallet no están disponibles en este momento'
      );
      expect(saldoDisponible().getByText(/\$\s*15\.000,00/)).toBeInTheDocument();
    });

    it('en otra red avisa y no deja seguir hasta cambiar a Base Sepolia', async () => {
      conectarWalletDePrueba({ enOtraRed: true });
      const { user, dialogo } = await abrirRetiro();

      expect(await within(dialogo).findByRole('alert')).toHaveTextContent('Estás en otra red');
      await user.type(within(dialogo).getByLabelText(/Monto a retirar/i), '10000');
      expect(within(dialogo).getByRole('button', { name: 'Continuar' })).toBeDisabled();

      await user.click(within(dialogo).getByRole('button', { name: 'Cambiar a Base Sepolia' }));

      await waitFor(() => expect(within(dialogo).queryByRole('alert')).not.toBeInTheDocument());
      expect(within(dialogo).getByRole('button', { name: 'Continuar' })).toBeEnabled();
    });

    it('con la billetera bloqueada, Retirar a la wallet aparece deshabilitado', async () => {
      setBilleteraMock({ estado: 'BLOQUEADA' });
      await renderRuta('/billetera', { usuario: 'participante' });

      expect(await screen.findByRole('button', { name: 'Retirar a la wallet' })).toBeDisabled();
    });
  });

  describe('al cobrarlo', () => {
    it('con la firma rechazada avisa, y se puede cobrar de nuevo el mismo permiso', async () => {
      setBilleteraMock({ saldoRetenido: 1234 });
      setCadenaMock({ errorAlEnviar: { code: 4001, message: 'User rejected the request.' } });
      const { user, dialogo } = await cobrarDiezMil();

      expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
        'Cancelaste el cobro en la wallet'
      );

      setCadenaMock({ errorAlEnviar: null });
      await user.click(within(dialogo).getByRole('button', { name: 'Cobrar de nuevo' }));

      expect(await within(dialogo).findByText(/Cobrado/)).toBeInTheDocument();
      // un solo pedido al back: el saldo se descontó una vez
      expect(saldoDisponible().getByText(/\$\s*5\.000,00/)).toBeInTheDocument();
    });

    it('sin ETH para el gas avisa antes de abrir la wallet y lleva al faucet', async () => {
      setCadenaMock({ saldoWei: 0n });
      const { dialogo } = await cobrarDiezMil();

      expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
        'necesitás un poco de ETH en tu wallet para el gas'
      );
      expect(within(dialogo).getByRole('link', { name: /ETH de prueba/ })).toHaveAttribute(
        'href',
        expect.stringContaining('faucet')
      );
      expect(getTransaccionesEnviadas()).toHaveLength(0);
    });

    it('si el contrato lo revierte, dice por qué y no lo manda a confirmar', async () => {
      let confirmaciones = 0;
      server.use(
        http.post(`${API_URL}/billetera/retiros/cripto/:referencia/confirmar`, () => {
          confirmaciones++;
          return undefined;
        })
      );
      setCadenaMock({
        reciboExitoso: false,
        errorDelContrato: {
          code: 3,
          message: 'execution reverted',
          data: encodeErrorResult({
            abi: pasarelaRetirosAbi,
            errorName: 'SaldoInsuficiente',
            args: [0n, 100_000_000_000_000n],
          }),
        },
      });
      const { dialogo } = await cobrarDiezMil();

      expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
        'La pasarela no tiene fondos para pagarlo ahora'
      );
      expect(within(dialogo).getByRole('link', { name: 'Ver en BaseScan' })).toBeInTheDocument();
      expect(within(dialogo).getByRole('button', { name: 'Cobrar de nuevo' })).toBeInTheDocument();
      expect(confirmaciones).toBe(0);
    });

    it('si el back rechaza el cobro, muestra su mensaje', async () => {
      server.use(
        http.post(`${API_URL}/billetera/retiros/cripto/:referencia/confirmar`, () =>
          HttpResponse.json(
            { status: 409, codigo: 'RETIRO_VENCIDO', detail: 'vencido' },
            { status: 409 }
          )
        )
      );
      const { dialogo } = await cobrarDiezMil();

      expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
        'El permiso venció sin cobrarse: el saldo volvió a tu billetera'
      );
    });
  });

  describe('un retiro pedido antes', () => {
    it('aparece en Retiros sin cobrar y se cobra desde ahí', async () => {
      agregarRetiroCriptoMock(permiso());
      const { user, dialogo } = await abrirRetiro();

      const lista = await within(dialogo).findByRole('region', { name: 'Retiros sin cobrar' });
      expect(lista).toHaveTextContent(/\$\s*2\.000,00 \(0,00002 ETH\) a 0x1111…1111/);
      await user.click(within(lista).getByRole('button', { name: 'Cobrar' }));
      await user.click(within(dialogo).getByRole('button', { name: 'Cobrar con MetaMask' }));

      expect(await within(dialogo).findByText(/Cobrado: 0,00002 ETH/)).toBeInTheDocument();
      expect(getTransaccionesEnviadas()[0].data).toContain('e'.repeat(64));
    });

    it('si es para otra wallet, pide conectarla y no manda nada', async () => {
      agregarRetiroCriptoMock(permiso({ destino: `0x${'2'.repeat(40)}` }));
      const { user, dialogo } = await abrirRetiro();

      const lista = await within(dialogo).findByRole('region', { name: 'Retiros sin cobrar' });
      await user.click(within(lista).getByRole('button', { name: 'Cobrar' }));
      await user.click(within(dialogo).getByRole('button', { name: 'Cobrar con MetaMask' }));

      expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
        'Este retiro es para la wallet 0x2222…2222: conectala para cobrarlo'
      );
      expect(getTransaccionesEnviadas()).toHaveLength(0);
    });

    it('si ya venció, avisa que el saldo vuelve y no manda nada', async () => {
      agregarRetiroCriptoMock(permiso({ vence: Math.floor(Date.now() / 1000) - 60 }));
      const { user, dialogo } = await abrirRetiro();

      const lista = await within(dialogo).findByRole('region', { name: 'Retiros sin cobrar' });
      await user.click(within(lista).getByRole('button', { name: 'Cobrar' }));
      await user.click(within(dialogo).getByRole('button', { name: 'Cobrar con MetaMask' }));

      expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
        'El permiso venció: el saldo vuelve a tu billetera'
      );
      expect(within(dialogo).queryByRole('button', { name: 'Cobrar de nuevo' })).toBeNull();
      expect(getTransaccionesEnviadas()).toHaveLength(0);
    });
  });
});
