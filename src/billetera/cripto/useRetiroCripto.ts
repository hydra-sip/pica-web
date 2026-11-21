import { useCallback, useEffect, useReducer, useRef } from 'react';
import {
  BaseError,
  ContractFunctionRevertedError,
  encodeFunctionData,
  InsufficientFundsError,
  UserRejectedRequestError,
} from 'viem';
import { useConfig } from 'wagmi';
import { estimateGas, getAccount, getPublicClient, writeContract } from 'wagmi/actions';
import { billeteraApi, type LimitesRetiro, type RetiroCripto } from '../../api/billeteraApi';
import { mensajeDeError } from '../../shared/mensajesError';
import type { Hash } from './cargaCripto';
import { CargaDemorada, confirmarHastaCobrar, EsperaCancelada } from './confirmacion';
import { MOTIVO_DE_REVERSION_RETIRO, pasarelaRetirosAbi } from './pasarelaRetiros';
import {
  type ErrorRetiro,
  ESTADO_INICIAL_RETIRO,
  retiroCriptoReducer,
  validarMontoRetiro,
  walletCorta,
} from './retiroCripto';

const SIN_FONDOS: ErrorRetiro = {
  tipo: 'sinFondos',
  mensaje: 'Para cobrar necesitás un poco de ETH en tu wallet para el gas.',
};

const VENCIDO: ErrorRetiro = {
  tipo: 'vencido',
  mensaje: 'El permiso venció: el saldo vuelve a tu billetera en unos minutos.',
};

/** Lo que salió mal al estimar o enviar el cobro, antes de tener el hash. */
const errorDeEnvio = (err: unknown): ErrorRetiro => {
  if (err instanceof BaseError) {
    if (err.walk((e) => e instanceof UserRejectedRequestError)) {
      return { tipo: 'firmaRechazada', mensaje: 'Cancelaste el cobro en la wallet.' };
    }
    if (err.walk((e) => e instanceof InsufficientFundsError)) return SIN_FONDOS;
  }
  return { tipo: 'inesperado', mensaje: 'No se pudo enviar el cobro. Probá de nuevo.' };
};

// en minúscula viem no valida el checksum: la dirección viene del back tal como esté configurada
const contrato = (retiro: RetiroCripto) => retiro.contrato.toLowerCase() as `0x${string}`;

const argumentos = (retiro: RetiroCripto) =>
  [retiro.referencia, BigInt(retiro.montoWei), BigInt(retiro.vence), retiro.firma] as const;

type ClientePublico = NonNullable<ReturnType<typeof getPublicClient>>;

/** Por qué revirtió el cobro: se repite la llamada en su bloque y se lee el error del contrato. */
const motivoDeReversion = async (
  red: ClientePublico,
  retiro: RetiroCripto,
  cuenta: `0x${string}`,
  bloque: bigint
): Promise<string> => {
  const generico = 'La transacción falló.';
  try {
    await red.simulateContract({
      address: contrato(retiro),
      abi: pasarelaRetirosAbi,
      functionName: 'cobrar',
      args: argumentos(retiro),
      account: cuenta,
      blockNumber: bloque,
    });
  } catch (err) {
    const revertido =
      err instanceof BaseError ? err.walk((e) => e instanceof ContractFunctionRevertedError) : null;
    const nombre =
      revertido instanceof ContractFunctionRevertedError ? revertido.data?.errorName : undefined;
    return (nombre && MOTIVO_DE_REVERSION_RETIRO[nombre]) || generico;
  }
  return generico;
};

/**
 * Los pasos de un retiro a la wallet (HU-610): pedirlo en el back, que descuenta el saldo y firma el permiso;
 * cobrarlo en PasarelaRetiros desde la wallet; esperar el recibo y confirmarlo en el back con el hash.
 */
export const useRetiroCripto = ({
  onPedido,
  onCobrado,
}: {
  onPedido: (retiro: RetiroCripto) => void;
  onCobrado: (retiro: RetiroCripto) => void;
}) => {
  const config = useConfig();
  const [estado, dispatch] = useReducer(retiroCriptoReducer, ESTADO_INICIAL_RETIRO);

  // al cerrar el modal se deja de esperar la confirmación
  const cierre = useRef(new AbortController());
  useEffect(() => {
    cierre.current = new AbortController();
    return () => cierre.current.abort();
  }, []);

  const pedir = useCallback(
    async (montoTexto: string, limites: LimitesRetiro, saldoDisponible: number) => {
      const validado = validarMontoRetiro(montoTexto, limites, saldoDisponible);
      if ('error' in validado) {
        dispatch({ tipo: 'montoInvalido', mensaje: validado.error });
        return;
      }
      const { address } = getAccount(config);
      if (!address) {
        dispatch({ tipo: 'montoInvalido', mensaje: 'Conectá tu wallet para retirar.' });
        return;
      }
      dispatch({ tipo: 'pedir' });
      try {
        const retiro = await billeteraApi.solicitarRetiroCripto(validado.monto, address);
        dispatch({ tipo: 'listo', retiro });
        onPedido(retiro);
      } catch (err) {
        dispatch({
          tipo: 'falloAlPedir',
          mensaje: mensajeDeError(err, 'No se pudo pedir el retiro.', {
            SALDO_INSUFICIENTE: 'El saldo disponible no alcanza para ese retiro.',
          }),
        });
      }
    },
    [config, onPedido]
  );

  /** Un retiro pedido antes que todavía se puede cobrar. */
  const retomar = useCallback((retiro: RetiroCripto) => {
    dispatch({ tipo: 'listo', retiro });
  }, []);

  const confirmar = useCallback(
    async (retiro: RetiroCripto, hash: Hash) => {
      try {
        const cobrado = await confirmarHastaCobrar(retiro.referencia, hash, cierre.current.signal);
        dispatch({ tipo: 'cobrado' });
        onCobrado(cobrado);
      } catch (err) {
        // al cerrar el modal el retiro queda pendiente: se retoma al volver a abrirlo
        if (err instanceof EsperaCancelada) return;
        if (err instanceof CargaDemorada) {
          dispatch({ tipo: 'demorado' });
          return;
        }
        const mensaje = mensajeDeError(err, 'No se pudo confirmar el cobro.');
        dispatch({ tipo: 'fallo', error: { tipo: 'rechazadoPorElBack', mensaje } });
      }
    },
    [onCobrado]
  );

  const reintentar = useCallback(
    async (retiro: RetiroCripto, hash: Hash) => {
      dispatch({ tipo: 'reintentar' });
      await confirmar(retiro, hash);
    },
    [confirmar]
  );

  const cobrar = useCallback(
    async (retiro: RetiroCripto) => {
      dispatch({ tipo: 'firmar' });
      const { address } = getAccount(config);

      // el contrato solo le paga a la wallet del permiso
      if (address?.toLowerCase() !== retiro.destino.toLowerCase()) {
        dispatch({
          tipo: 'fallo',
          error: {
            tipo: 'otraWallet',
            mensaje: `Este retiro es para la wallet ${walletCorta(retiro.destino)}: conectala para cobrarlo.`,
          },
        });
        return;
      }
      if (retiro.vence * 1000 < Date.now()) {
        dispatch({ tipo: 'fallo', error: VENCIDO });
        return;
      }

      // antes de abrir la wallet: que alcance para el gas
      const red = getPublicClient(config, { chainId: retiro.chainId })!;
      try {
        const [saldo, gas, gasPrice] = await Promise.all([
          red.getBalance({ address }),
          estimateGas(config, {
            account: address,
            to: contrato(retiro),
            data: encodeFunctionData({
              abi: pasarelaRetirosAbi,
              functionName: 'cobrar',
              args: argumentos(retiro),
            }),
            chainId: retiro.chainId,
          }),
          red.getGasPrice(),
        ]);
        if (saldo < gas * gasPrice) {
          dispatch({ tipo: 'fallo', error: SIN_FONDOS });
          return;
        }
      } catch (err) {
        // si no se pudo estimar por otra cosa, que lo diga la wallet al enviar
        if (errorDeEnvio(err).tipo === 'sinFondos') {
          dispatch({ tipo: 'fallo', error: SIN_FONDOS });
          return;
        }
      }

      let hash: Hash;
      try {
        hash = await writeContract(config, {
          address: contrato(retiro),
          abi: pasarelaRetirosAbi,
          functionName: 'cobrar',
          args: argumentos(retiro),
          chainId: retiro.chainId,
        });
      } catch (err) {
        dispatch({ tipo: 'fallo', error: errorDeEnvio(err) });
        return;
      }
      dispatch({ tipo: 'enviada', hash });

      const recibo = await red.waitForTransactionReceipt({ hash });
      if (cierre.current.signal.aborted) return;
      if (recibo.status === 'reverted') {
        const mensaje = await motivoDeReversion(red, retiro, recibo.from, recibo.blockNumber);
        dispatch({ tipo: 'fallo', error: { tipo: 'revertida', mensaje } });
        return;
      }
      await confirmar(retiro, hash);
    },
    [config, confirmar]
  );

  return { estado, pedir, retomar, cobrar, reintentar };
};
