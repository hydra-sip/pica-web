import { useCallback, useReducer } from 'react';
import {
  BaseError,
  encodeFunctionData,
  InsufficientFundsError,
  UserRejectedRequestError,
} from 'viem';
import { useConfig } from 'wagmi';
import {
  estimateGas,
  getAccount,
  getPublicClient,
  waitForTransactionReceipt,
  writeContract,
} from 'wagmi/actions';
import { billeteraApi, type CargaCripto, type MovimientoBilletera } from '../../api/billeteraApi';
import { mensajeDeError } from '../../shared/mensajesError';
import {
  cargaCriptoReducer,
  type ErrorCarga,
  ESTADO_INICIAL,
  type Hash,
  validarMonto,
} from './cargaCripto';
import { CargaDemorada, confirmarHastaAcreditar } from './confirmacion';
import { pasarelaCargasAbi } from './pasarelaCargas';

const SIN_FONDOS: ErrorCarga = {
  tipo: 'sinFondos',
  mensaje: 'No te alcanza para el pago y el gas.',
};

/** Lo que salió mal al estimar o enviar la transacción, antes de tener el hash. */
const errorDeEnvio = (err: unknown): ErrorCarga => {
  if (err instanceof BaseError) {
    if (err.walk((e) => e instanceof UserRejectedRequestError)) {
      return { tipo: 'firmaRechazada', mensaje: 'Cancelaste el pago en la wallet.' };
    }
    if (err.walk((e) => e instanceof InsufficientFundsError)) return SIN_FONDOS;
  }
  return { tipo: 'inesperado', mensaje: 'No se pudo enviar el pago. Probá de nuevo.' };
};

/**
 * Los pasos de una carga con cripto (HU-609): iniciarla en el back, pagarla en el contrato con la wallet,
 * esperar el recibo y confirmarla en el back con el hash.
 */
export const useCargaCripto = (onAcreditada: (movimiento: MovimientoBilletera) => void) => {
  const config = useConfig();
  const [estado, dispatch] = useReducer(cargaCriptoReducer, ESTADO_INICIAL);

  const iniciar = useCallback(async (montoTexto: string) => {
    const validado = validarMonto(montoTexto);
    if ('error' in validado) {
      dispatch({ tipo: 'montoInvalido', mensaje: validado.error });
      return;
    }
    dispatch({ tipo: 'iniciar' });
    try {
      dispatch({ tipo: 'iniciada', carga: await billeteraApi.iniciarCargaCripto(validado.monto) });
    } catch (err) {
      dispatch({
        tipo: 'falloAlIniciar',
        mensaje: mensajeDeError(err, 'No se pudo iniciar la carga.'),
      });
    }
  }, []);

  const acreditar = useCallback(
    async (carga: CargaCripto, hash: Hash) => {
      try {
        const movimiento = await confirmarHastaAcreditar(carga.referencia, hash);
        dispatch({ tipo: 'acreditada', movimiento });
        onAcreditada(movimiento);
      } catch (err) {
        if (err instanceof CargaDemorada) {
          dispatch({ tipo: 'demorada' });
          return;
        }
        const mensaje = mensajeDeError(err, 'No se pudo acreditar la carga.');
        dispatch({ tipo: 'fallo', error: { tipo: 'rechazadaPorElBack', mensaje } });
      }
    },
    [onAcreditada]
  );

  const reintentar = useCallback(
    async (carga: CargaCripto, hash: Hash) => {
      dispatch({ tipo: 'reintentar' });
      await acreditar(carga, hash);
    },
    [acreditar]
  );

  const pagar = useCallback(
    async (carga: CargaCripto) => {
      dispatch({ tipo: 'firmar' });
      const value = BigInt(carga.montoWei);
      const { address } = getAccount(config);

      // antes de abrir la wallet: que alcance para el pago más el gas
      try {
        const red = getPublicClient(config, { chainId: carga.chainId })!;
        const [saldo, gas, gasPrice] = await Promise.all([
          red.getBalance({ address: address! }),
          estimateGas(config, {
            account: address,
            to: carga.contrato,
            data: encodeFunctionData({
              abi: pasarelaCargasAbi,
              functionName: 'cargar',
              args: [carga.referencia],
            }),
            value,
            chainId: carga.chainId,
          }),
          red.getGasPrice(),
        ]);
        if (saldo < value + gas * gasPrice) {
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
          address: carga.contrato,
          abi: pasarelaCargasAbi,
          functionName: 'cargar',
          args: [carga.referencia],
          value,
          chainId: carga.chainId,
        });
      } catch (err) {
        dispatch({ tipo: 'fallo', error: errorDeEnvio(err) });
        return;
      }
      dispatch({ tipo: 'enviada', hash });

      await waitForTransactionReceipt(config, { hash, chainId: carga.chainId });
      await acreditar(carga, hash);
    },
    [config, acreditar]
  );

  return { estado, iniciar, pagar, reintentar };
};
