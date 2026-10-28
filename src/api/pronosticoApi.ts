import { httpClient } from './httpClient';
import { EstadoPartido, LadoBracket } from './torneoApi';

export type Eleccion = '1' | 'X' | '2';

export interface MiPronostico {
  eleccion: Eleccion;
  /** Null si el partido aún no finalizó o no fue confirmado; >= 0 cuando se calcularon los puntos (3 acierto, 0 fallo). */
  puntos: number | null;
  creadoEn: string;
  modificadoEn: string;
}

export interface PartidoPronostico {
  partidoId: number;
  torneoId: number;
  torneoNombre: string;
  ronda: number;
  nombreRonda: string;
  posicion: number;
  estado: EstadoPartido;
  fechaProgramada: string | null;
  cierraEn: string | null;
  /** True si la ventana para cargar o modificar el pronóstico está abierta. */
  abierto: boolean;
  local: LadoBracket | null;
  visitante: LadoBracket | null;
  miPronostico: MiPronostico | null;
}

export interface PronosticoRequest {
  eleccion: Eleccion;
}

export interface PronosticoDetalle {
  partidoId: number;
  usuarioId: number;
  eleccion: Eleccion;
  puntos: number | null;
  creadoEn: string;
  modificadoEn: string;
}

export interface FilaRanking {
  posicion: number;
  usuarioId: number;
  username: string;
  nombreCompleto: string;
  puntos: number;
  aciertos: number;
  pronosticosTotales: number;
  efectividadPct?: number;
}

export interface ListarPartidosParams {
  torneoId?: number;
  abierto?: boolean;
}

export const pronosticoApi = {
  /** Lista de partidos para pronósticos (HU-306, T306-1). */
  listarPartidos: async (params?: ListarPartidosParams): Promise<PartidoPronostico[]> => {
    const searchParams = new URLSearchParams();
    if (params?.torneoId != null) {
      searchParams.set('torneoId', String(params.torneoId));
    }
    if (params?.abierto != null) {
      searchParams.set('abierto', String(params.abierto));
    }
    const query = searchParams.toString();
    return httpClient.get<PartidoPronostico[]>(`/pronosticos/partidos${query ? `?${query}` : ''}`);
  },

  /** Registra o actualiza el pronóstico del usuario para un partido. */
  guardarPronostico: async (partidoId: number, eleccion: Eleccion): Promise<PronosticoDetalle> => {
    return httpClient.put<PronosticoDetalle>(`/partidos/${partidoId}/pronostico`, { eleccion });
  },

  /** Tabla de posiciones / ranking de pronósticos (general o por torneo). */
  ranking: async (torneoId?: number): Promise<FilaRanking[]> => {
    const searchParams = new URLSearchParams();
    if (torneoId != null) {
      searchParams.set('torneoId', String(torneoId));
    }
    const query = searchParams.toString();
    return httpClient.get<FilaRanking[]>(`/pronosticos/ranking${query ? `?${query}` : ''}`);
  },
};
