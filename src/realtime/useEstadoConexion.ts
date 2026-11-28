import { useEffect, useState } from 'react';
import { onEstadoConexion, websocketService } from './websocketService';

/** Si la conexión del tiempo real está arriba; cambia cada vez que se cae o vuelve (HU-809). */
export function useEstadoConexion(): boolean {
  const [conectado, setConectado] = useState(() => websocketService.isConnectedStatus());

  useEffect(() => {
    setConectado(websocketService.isConnectedStatus());
    return onEstadoConexion(setConectado);
  }, []);

  return conectado;
}
