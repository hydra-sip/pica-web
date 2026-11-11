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
import { billeteraApi, type CargaCripto, type MovimientoBilletera } from '../../api/billeteraApi';
import { mensajeDeError } from '../../shared/mensajesError';
import {
  cargaCriptoReducer,
  type ErrorCarga,
  ESTADO_INICIAL,
  type Hash,
  validarMonto,
} from './cargaCripto';
import { borrarCargaPendiente, guardarCargaPendiente } from './cargaPendiente';
import { CargaDemorada, confirmarHastaAcreditar, EsperaCancelada } from './confirmacion';
import { MOTIVO_DE_REVERSION, pasarelaCargasAbi } from './pasarelaCargas';

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

type ClientePublico = NonNullable<ReturnType<typeof getPublicClient>>;

/**
 * Por qué revirtió el pago: se repite la llamada en el bloque de la transacción y se lee el error del contrato.
 * Si no se puede saber, el mensaje genérico.
 */
const motivoDeReversion = async (
  red: ClientePublico,
  carga: CargaCripto,
  pagador: `0x${string}`,
  bloque: bigint
): Promise<string> => {
  const generico = 'La transacción falló.';
  try {
    await red.simulateContract({
      address: carga.contrato,
      abi: pasarelaCargasAbi,
      functionName: 'cargar',
      args: [carga.referencia],
      value: BigInt(carga.montoWei),
      account: pagador,
      blockNumber: bloque,
    });
  } catch (err) {
    const revertido =
      err instanceof BaseError ? err.walk((e) => e instanceof ContractFunctionRevertedError) : null;
    const nombre =
      revertido instanceof ContractFunctionRevertedError ? revertido.data?.errorName : undefined;
    return (nombre && MOTIVO_DE_REVERSION[nombre]) || generico;
  }
  return generico;
};

/**
 * Los pasos de una carga con cripto (HU-609): iniciarla en el back, pagarla en el contrato con la wallet,
 * esperar el recibo y confirmarla en el back con el hash.
 */
export const useCargaCripto = (
  usuarioId: number | string,
  onAcreditada: (movimiento: MovimientoBilletera) => void
) => {
  const config = useConfig();
  const [estado, dispatch] = useReducer(cargaCriptoReducer, ESTADO_INICIAL);

  // al cerrar el modal se deja de esperar la acreditación
  const cierre = useRef(new AbortController());
  useEffect(() => {
    cierre.current = new AbortController();
    return () => cierre.current.abort();
  }, []);

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
        const movimiento = await confirmarHastaAcreditar(
          carga.referencia,
          hash,
          cierre.current.signal
        );
        borrarCargaPendiente(usuarioId, carga.referencia);
        dispatch({ tipo: 'acreditada', movimiento });
        onAcreditada(movimiento);
      } catch (err) {
        // al cerrar el modal la carga queda guardada: la retoma Mi billetera
        if (err instanceof EsperaCancelada) return;
        if (err instanceof CargaDemorada) {
          dispatch({ tipo: 'demorada' });
          return;
        }
        borrarCargaPendiente(usuarioId, carga.referencia);
        const mensaje = mensajeDeError(err, 'No se pudo acreditar la carga.');
        dispatch({ tipo: 'fallo', error: { tipo: 'rechazadaPorElBack', mensaje } });
      }
    },
    [onAcreditada, usuarioId]
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
      // desde acá el pago está hecho: si se cierra la pestaña, Mi billetera lo retoma
      guardarCargaPendiente(usuarioId, {
        referencia: carga.referencia,
        hash,
        montoPesos: carga.montoPesos,
      });
      dispatch({ tipo: 'enviada', hash });

      const red = getPublicClient(config, { chainId: carga.chainId })!;
      const recibo = await red.waitForTransactionReceipt({ hash });
      if (cierre.current.signal.aborted) return;
      if (recibo.status === 'reverted') {
        // no hay nada que acreditar
        borrarCargaPendiente(usuarioId, carga.referencia);
        const mensaje = await motivoDeReversion(red, carga, recibo.from, recibo.blockNumber);
        dispatch({ tipo: 'fallo', error: { tipo: 'revertida', mensaje } });
        return;
      }
      await acreditar(carga, hash);
    },
    [config, acreditar, usuarioId]
  );

  return { estado, iniciar, pagar, reintentar };
};
