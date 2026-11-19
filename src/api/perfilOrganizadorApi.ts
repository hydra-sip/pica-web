import { httpClient } from './httpClient';
import { TorneoResumen } from '../torneos/types/torneo';

export interface MovimientoIndiceOrganizador {
  torneoId: number;
  torneo: string;
  conGastos: boolean;
  delta: number;
  valorResultante: number;
  creadoEn: string;
}

/** GET /usuarios/{id}/perfil-organizador (HU-806). Público, sin datos privados. */
export interface PerfilOrganizador {
  id: number;
  username: string;
  nombreCompleto: string;
  avatar: string | null;
  torneosOrganizados: number;
  torneosFinalizados: number;
  torneosCancelados: number;
  indice: number;
  indiceActualizadoEn: string | null;
  historialIndice: MovimientoIndiceOrganizador[];
  torneosProximos: TorneoResumen[];
}

export const perfilOrganizadorApi = {
  ver: async (usuarioId: number): Promise<PerfilOrganizador> => {
    return httpClient.get<PerfilOrganizador>(`/usuarios/${usuarioId}/perfil-organizador`);
  },
};
