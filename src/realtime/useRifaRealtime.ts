import { useEffect, useRef } from 'react';
import { EstadoRifa, RifaDetalle } from '../api/rifaApi';
import { RifaWebSocketMessage, subscribeToRifa } from './websocketService';

export interface UseRifaRealtimeOptions {
  onRifaChange?: (rifa: RifaDetalle) => void;
  onEstadoChange?: (estado: EstadoRifa) => void;
  onActualizar?: (data: RifaWebSocketMessage) => void;
  onReconnect?: () => void;
}

/**
 * Hook para suscribirse en tiempo real a las actualizaciones de una rifa en `/topic/rifas/{id}`.
 * Recibe ventas de números, actualizaciones de pozo y cambios de estado.
 * Cuando se reconecta tras una pérdida de conexión, ejecuta `onReconnect` para sincronizar con el backend.
 */
export function useRifaRealtime(
  rifaId: number | null | undefined,
  options: UseRifaRealtimeOptions
) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!rifaId) return undefined;

    const unsubscribe = subscribeToRifa(rifaId, {
      onMessage: (data) => {
        if (data.rifa) {
          optionsRef.current.onRifaChange?.(data.rifa);
        }

        if (data.estado) {
          optionsRef.current.onEstadoChange?.(data.estado);
        }

        optionsRef.current.onActualizar?.(data);
      },
      onReconnect: () => {
        optionsRef.current.onReconnect?.();
      },
    });

    return () => {
      unsubscribe();
    };
  }, [rifaId]);
}
