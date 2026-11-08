import { useCallback, useEffect, useState } from 'react';
import { Billetera, billeteraApi } from '../../api/billeteraApi';

/**
 * La billetera de quien paga (HU-603), para mostrar el saldo antes de pagar y el que quedó después. Con `activo` en
 * false no la pide (un modal cerrado). Si no se pudo leer, `billetera` queda en null y `error` en true.
 */
export const useSaldo = (activo = true) => {
  const [billetera, setBilletera] = useState<Billetera | null>(null);
  const [error, setError] = useState(false);
  const [cargando, setCargando] = useState(activo);

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      setBilletera(await billeteraApi.obtener());
      setError(false);
    } catch {
      setBilletera(null);
      setError(true);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (activo) void recargar();
  }, [activo, recargar]);

  return { billetera, error, cargando, recargar };
};

/** Si el disponible alcanza para el total. Sin saber el saldo no se bloquea: el back decide. */
export const alcanzaElSaldo = (billetera: Billetera | null, total: number): boolean =>
  billetera === null || billetera.saldoDisponible >= total;
