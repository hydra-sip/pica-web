import { useCallback, useEffect, useState } from 'react';
import { EVENTO_NOTIFICACIONES_LEIDAS, Notificacion, notificacionApi } from '../api/notificacionApi';
import { websocketService } from '../realtime/websocketService';

/**
 * La campana del usuario logueado (HU-808): cuántas notificaciones no leyó y la última que llegó en vivo, para el
 * toast. El contador se vuelve a pedir al cambiar de pantalla y cuando el centro marca leídas; lo que llega por
 * WebSocket lo suma sin pedir nada.
 */
export const useNotificaciones = (usuarioId: number | string | undefined, pathname: string) => {
  const [noLeidas, setNoLeidas] = useState(0);
  const [recienLlegada, setRecienLlegada] = useState<Notificacion | null>(null);

  useEffect(() => {
    if (usuarioId === undefined) {
      setNoLeidas(0);
      return;
    }
    let vigente = true;
    const consultar = () => {
      notificacionApi
        .noLeidas()
        .then((cantidad) => {
          if (vigente) setNoLeidas(cantidad);
        })
        .catch(() => {
          // Sin el número la campana sigue llevando al centro: no hace falta avisar.
        });
    };
    consultar();
    window.addEventListener(EVENTO_NOTIFICACIONES_LEIDAS, consultar);
    return () => {
      vigente = false;
      window.removeEventListener(EVENTO_NOTIFICACIONES_LEIDAS, consultar);
    };
  }, [usuarioId, pathname]);

  // La sesión STOMP queda a nombre de quien se conectó: al entrar o salir se reconecta con el token nuevo
  useEffect(() => {
    void websocketService.reconectar();
    if (usuarioId === undefined) {
      setRecienLlegada(null);
      return;
    }
    return websocketService.subscribeToNotificaciones((notificacion) => {
      setNoLeidas((cantidad) => cantidad + 1);
      setRecienLlegada(notificacion);
    });
  }, [usuarioId]);

  const cerrarToast = useCallback(() => setRecienLlegada(null), []);

  return { noLeidas, recienLlegada, cerrarToast };
};
