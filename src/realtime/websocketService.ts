import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { BracketTorneo, EstadoTorneo, RondaBracket } from '../api/torneoApi';
import { EstadoRifa, RifaDetalle } from '../api/rifaApi';

export interface TorneoWebSocketMessage {
  tipo?: string;
  torneoId?: number;
  bracket?: BracketTorneo;
  rondas?: RondaBracket[];
  pozoEstimado?: number;
  premioRifaEstimado?: number | null;
  estado?: EstadoTorneo;
  [key: string]: unknown;
}

export interface RifaWebSocketMessage {
  tipo?: string;
  rifaId?: number;
  torneoId?: number | null;
  estado?: EstadoRifa;
  pozoEstimado?: number;
  numerosVendidos?: number;
  rifa?: RifaDetalle;
  [key: string]: unknown;
}

export interface TorneoSubscriptionCallbacks {
  onMessage: (data: TorneoWebSocketMessage) => void;
  onReconnect?: () => void;
}

export interface RifaSubscriptionCallbacks {
  onMessage: (data: RifaWebSocketMessage) => void;
  onReconnect?: () => void;
}

export const getWsUrl = (): string => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
  try {
    const origin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'http://localhost:8080';
    const parsed = new URL(apiUrl, origin);
    parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
    parsed.pathname = '/ws';
    parsed.search = '';
    return parsed.toString();
  } catch {
    return 'ws://localhost:8080/ws';
  }
};

class WebSocketService {
  private client: Client | null = null;
  private torneoListeners = new Map<number, Set<TorneoSubscriptionCallbacks>>();
  private rifaListeners = new Map<number, Set<RifaSubscriptionCallbacks>>();
  private stompSubscriptions = new Map<string, StompSubscription>();
  private wasConnected = false;
  private isConnected = false;
  private isTestMode =
    typeof process !== 'undefined' &&
    (process.env.NODE_ENV === 'test' || import.meta.env.MODE === 'test');

  constructor() {
    if (!this.isTestMode && typeof window !== 'undefined') {
      this.initClient();
    }
  }

  private initClient() {
    if (this.client) return;

    this.client = new Client({
      brokerURL: getWsUrl(),
      reconnectDelay: 3000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        const hadPriorConnection = this.wasConnected;
        this.isConnected = true;
        this.wasConnected = true;

        this.resubscribeTopics();

        if (hadPriorConnection) {
          this.notifyReconnectAll();
        }
      },
      onDisconnect: () => {
        this.isConnected = false;
      },
      onWebSocketClose: () => {
        this.isConnected = false;
      },
      onStompError: (frame) => {
        console.error('STOMP protocol error:', frame.headers?.message, frame.body);
      },
    });
  }

  public activate() {
    this.initClient();
    if (this.client && !this.client.active) {
      this.client.activate();
    }
  }

  public deactivate() {
    if (this.client && this.client.active) {
      this.client.deactivate();
    }
    this.isConnected = false;
    this.stompSubscriptions.clear();
  }

  private resubscribeTopics() {
    if (!this.client || !this.client.connected) return;

    for (const torneoId of this.torneoListeners.keys()) {
      this.setupStompSubscription(`/topic/torneos/${torneoId}`, (payload) => {
        this.emitTorneoLocal(torneoId, payload);
      });
    }

    for (const rifaId of this.rifaListeners.keys()) {
      this.setupStompSubscription(`/topic/rifas/${rifaId}`, (payload) => {
        this.emitRifaLocal(rifaId, payload);
      });
    }
  }

  private setupStompSubscription(destination: string, handler: (payload: unknown) => void) {
    if (!this.client || !this.client.connected) return;
    if (this.stompSubscriptions.has(destination)) return;

    const sub = this.client.subscribe(destination, (message: IMessage) => {
      try {
        const data = JSON.parse(message.body);
        handler(data);
      } catch (e) {
        console.warn(`Error al procesar mensaje STOMP en ${destination}:`, e);
      }
    });

    this.stompSubscriptions.set(destination, sub);
  }

  public subscribeToTorneo(torneoId: number, callbacks: TorneoSubscriptionCallbacks): () => void {
    if (!this.torneoListeners.has(torneoId)) {
      this.torneoListeners.set(torneoId, new Set());
    }
    this.torneoListeners.get(torneoId)!.add(callbacks);

    const destination = `/topic/torneos/${torneoId}`;
    if (!this.isTestMode) {
      this.activate();
      if (this.client?.connected) {
        this.setupStompSubscription(destination, (payload) => {
          this.emitTorneoLocal(torneoId, payload);
        });
      }
    }

    return () => {
      const listeners = this.torneoListeners.get(torneoId);
      if (listeners) {
        listeners.delete(callbacks);
        if (listeners.size === 0) {
          this.torneoListeners.delete(torneoId);
          const sub = this.stompSubscriptions.get(destination);
          if (sub) {
            sub.unsubscribe();
            this.stompSubscriptions.delete(destination);
          }
        }
      }
    };
  }

  public subscribeToRifa(rifaId: number, callbacks: RifaSubscriptionCallbacks): () => void {
    if (!this.rifaListeners.has(rifaId)) {
      this.rifaListeners.set(rifaId, new Set());
    }
    this.rifaListeners.get(rifaId)!.add(callbacks);

    const destination = `/topic/rifas/${rifaId}`;
    if (!this.isTestMode) {
      this.activate();
      if (this.client?.connected) {
        this.setupStompSubscription(destination, (payload) => {
          this.emitRifaLocal(rifaId, payload);
        });
      }
    }

    return () => {
      const listeners = this.rifaListeners.get(rifaId);
      if (listeners) {
        listeners.delete(callbacks);
        if (listeners.size === 0) {
          this.rifaListeners.delete(rifaId);
          const sub = this.stompSubscriptions.get(destination);
          if (sub) {
            sub.unsubscribe();
            this.stompSubscriptions.delete(destination);
          }
        }
      }
    };
  }

  private emitTorneoLocal(torneoId: number, payload: unknown) {
    const listeners = this.torneoListeners.get(torneoId);
    if (!listeners) return;

    let normalized: TorneoWebSocketMessage;
    const p = payload as Record<string, unknown> | null;
    if (p && Array.isArray(p.rondas) && !p.bracket) {
      normalized = {
        torneoId,
        bracket: payload as BracketTorneo,
        ...p,
      };
    } else {
      normalized = {
        torneoId,
        ...(p ?? {}),
      };
    }

    listeners.forEach((cb) => {
      try {
        cb.onMessage(normalized);
      } catch (err) {
        console.error('Error en callback de suscripción al torneo:', err);
      }
    });
  }

  private emitRifaLocal(rifaId: number, payload: unknown) {
    const listeners = this.rifaListeners.get(rifaId);
    if (!listeners) return;

    const p = (payload as Record<string, unknown> | null) ?? {};
    const normalized: RifaWebSocketMessage = {
      rifaId,
      ...p,
    };

    listeners.forEach((cb) => {
      try {
        cb.onMessage(normalized);
      } catch (err) {
        console.error('Error en callback de suscripción a la rifa:', err);
      }
    });
  }

  private notifyReconnectAll() {
    this.torneoListeners.forEach((listeners) => {
      listeners.forEach((cb) => {
        try {
          cb.onReconnect?.();
        } catch (err) {
          console.error('Error en onReconnect del torneo:', err);
        }
      });
    });

    this.rifaListeners.forEach((listeners) => {
      listeners.forEach((cb) => {
        try {
          cb.onReconnect?.();
        } catch (err) {
          console.error('Error en onReconnect de la rifa:', err);
        }
      });
    });
  }

  // --- Testing y Simulación ---
  public mockEmitTorneoEvent(torneoId: number, payload: unknown) {
    this.emitTorneoLocal(torneoId, payload);
  }

  public mockEmitRifaEvent(rifaId: number, payload: unknown) {
    this.emitRifaLocal(rifaId, payload);
  }

  public mockDisconnect() {
    this.isConnected = false;
    this.wasConnected = true;
  }

  public mockReconnect() {
    this.isConnected = true;
    this.notifyReconnectAll();
  }

  public isConnectedStatus(): boolean {
    return this.isConnected;
  }

  public reset() {
    this.torneoListeners.clear();
    this.rifaListeners.clear();
    this.stompSubscriptions.clear();
    this.wasConnected = false;
    this.isConnected = false;
  }
}

export const websocketService = new WebSocketService();

export const subscribeToTorneo = (
  torneoId: number,
  callbacks: TorneoSubscriptionCallbacks
): (() => void) => websocketService.subscribeToTorneo(torneoId, callbacks);

export const subscribeToRifa = (
  rifaId: number,
  callbacks: RifaSubscriptionCallbacks
): (() => void) => websocketService.subscribeToRifa(rifaId, callbacks);

export const mockEmitTorneoEvent = (torneoId: number, payload: unknown): void =>
  websocketService.mockEmitTorneoEvent(torneoId, payload);

export const mockEmitRifaEvent = (rifaId: number, payload: unknown): void =>
  websocketService.mockEmitRifaEvent(rifaId, payload);

export const mockDisconnect = (): void => websocketService.mockDisconnect();

export const mockReconnect = (): void => websocketService.mockReconnect();

export const resetRealtime = (): void => websocketService.reset();
