import { useEffect, useRef, useState } from 'react';
import type { MovimientoBilletera } from '../../api/billeteraApi';
import { mensajeDeError } from '../../shared/mensajesError';
import { borrarCargaPendiente, type CargaPendiente, leerCargasPendientes } from './cargaPendiente';
import { CargaDemorada, confirmarHastaAcreditar, EsperaCancelada } from './confirmacion';

/**
 * Retoma en Mi billetera las cargas con cripto pagadas que no se llegaron a acreditar (HU-609): las confirma con
 * el back como el modal, sin abrirlo. Mientras el modal está abierto (`pausado`), espera él.
 */
export const useRetomarCargasCripto = (
  usuarioId: number | string | undefined,
  pausado: boolean,
  onAcreditada: (movimiento: MovimientoBilletera) => void,
  onRechazada: (mensaje: string) => void
) => {
  const [pendientes, setPendientes] = useState<CargaPendiente[]>([]);
  const [demorada, setDemorada] = useState(false);
  const [intento, setIntento] = useState(0);
  const avisos = useRef({ onAcreditada, onRechazada });
  avisos.current = { onAcreditada, onRechazada };

  useEffect(() => {
    if (pausado || usuarioId === undefined) return;
    const cargas = leerCargasPendientes(usuarioId);
    setPendientes(cargas);
    setDemorada(false);
    if (!cargas.length) return;

    const control = new AbortController();
    const retomar = async () => {
      for (const carga of cargas) {
        try {
          const movimiento = await confirmarHastaAcreditar(
            carga.referencia,
            carga.hash,
            control.signal
          );
          borrarCargaPendiente(usuarioId, carga.referencia);
          avisos.current.onAcreditada(movimiento);
        } catch (err) {
          if (err instanceof EsperaCancelada) return;
          if (err instanceof CargaDemorada) {
            setDemorada(true);
            continue;
          }
          borrarCargaPendiente(usuarioId, carga.referencia);
          avisos.current.onRechazada(
            mensajeDeError(err, 'No se pudo acreditar tu carga con cripto.')
          );
        }
        setPendientes(leerCargasPendientes(usuarioId));
      }
    };
    void retomar();
    return () => control.abort();
  }, [usuarioId, pausado, intento]);

  return { pendientes, demorada, reintentar: () => setIntento((n) => n + 1) };
};
