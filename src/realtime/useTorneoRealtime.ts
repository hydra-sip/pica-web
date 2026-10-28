import { useEffect, useRef } from 'react';
import { BracketTorneo, EstadoTorneo } from '../api/torneoApi';
import { subscribeToTorneo, TorneoWebSocketMessage } from './websocketService';

export interface UseTorneoRealtimeOptions {
  onBracketChange?: (bracket: BracketTorneo) => void;
  onPozoChange?: (pozoEstimado: number, premioRifaEstimado?: number | null) => void;
  onEstadoChange?: (estado: EstadoTorneo | string) => void;
  onActualizar?: (data: TorneoWebSocketMessage) => void;
  onReconnect?: () => void;
}

/**
 * Hook para suscribirse en tiempo real a las actualizaciones de un torneo en `/topic/torneos/{id}`.
 * Recibe eventos de confirmación de resultados, avance de llave, incremento de pozo por venta y cambios de estado.
 * Cuando se reconecta tras una pérdida de conexión, ejecuta `onReconnect` para sincronizar con el backend.
 */
export function useTorneoRealtime(
  torneoId: number | null | undefined,
  options: UseTorneoRealtimeOptions
) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!torneoId) return undefined;

    const unsubscribe = subscribeToTorneo(torneoId, {
      onMessage: (data) => {
        if (data.bracket) {
          optionsRef.current.onBracketChange?.(data.bracket);
        } else if (data.rondas) {
          optionsRef.current.onBracketChange?.(data as unknown as BracketTorneo);
        }

        if (typeof data.pozoEstimado === 'number') {
          optionsRef.current.onPozoChange?.(data.pozoEstimado, data.premioRifaEstimado);
        }

        if (data.estado) {
          optionsRef.current.onEstadoChange?.(data.estado as EstadoTorneo);
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
  }, [torneoId]);
}
