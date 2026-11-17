import { httpClient } from './httpClient';
import { Gravedad } from './sancionApi';

export type TipoEventoFairPlay = 'CHECKIN' | 'AUSENCIA' | 'SANCION';

/** Un movimiento del índice: qué pasó, cuánto cambió (ya con el máximo y el piso) y en qué quedó. */
export interface MovimientoFairPlay {
  tipo: TipoEventoFairPlay;
  delta: number;
  valorResultante: number;
  torneoId: number;
  torneo: string;
  /** En el check-in y la ausencia. */
  partidoId: number | null;
  /** En la sanción. */
  sancionId: number | null;
  gravedad: Gravedad | null;
  creadoEn: string;
}

/** GET /usuarios/{id}/fair-play (HU-802). `actualizadoEn` null: nunca se movió y tiene el inicial. */
export interface FairPlayDetalle {
  usuarioId: number;
  valor: number;
  actualizadoEn: string | null;
  /** El último primero. */
  historial: MovimientoFairPlay[];
}

export const fairPlayApi = {
  ver: async (usuarioId: number): Promise<FairPlayDetalle> => {
    return httpClient.get<FairPlayDetalle>(`/usuarios/${usuarioId}/fair-play`);
  },
};
