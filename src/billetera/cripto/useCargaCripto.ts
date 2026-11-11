import { useCallback, useReducer } from 'react';
import { useConfig } from 'wagmi';
import { waitForTransactionReceipt, writeContract } from 'wagmi/actions';
import { billeteraApi, type CargaCripto, type MovimientoBilletera } from '../../api/billeteraApi';
import { mensajeDeError } from '../../shared/mensajesError';
import { cargaCriptoReducer, ESTADO_INICIAL, validarMonto } from './cargaCripto';
import { pasarelaCargasAbi } from './pasarelaCargas';

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

  const pagar = useCallback(
    async (carga: CargaCripto) => {
      dispatch({ tipo: 'firmar' });
      let hash: `0x${string}`;
      try {
        hash = await writeContract(config, {
          address: carga.contrato,
          abi: pasarelaCargasAbi,
          functionName: 'cargar',
          args: [carga.referencia],
          value: BigInt(carga.montoWei),
          chainId: carga.chainId,
        });
      } catch {
        dispatch({
          tipo: 'fallo',
          error: { tipo: 'inesperado', mensaje: 'No se pudo enviar el pago.' },
        });
        return;
      }
      dispatch({ tipo: 'enviada', hash });

      await waitForTransactionReceipt(config, { hash, chainId: carga.chainId });
      try {
        const movimiento = await billeteraApi.confirmarCargaCripto(carga.referencia, hash);
        dispatch({ tipo: 'acreditada', movimiento });
        onAcreditada(movimiento);
      } catch (err) {
        dispatch({
          tipo: 'fallo',
          error: {
            tipo: 'rechazadaPorElBack',
            mensaje: mensajeDeError(err, 'No se pudo acreditar la carga.'),
          },
        });
      }
    },
    [config, onAcreditada]
  );

  return { estado, iniciar, pagar };
};
