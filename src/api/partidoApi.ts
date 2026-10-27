import { customFetch, httpClient } from './httpClient';
import { EstadoPartido, LadoBracket } from './torneoApi';

export type Lado = 'LOCAL' | 'VISITANTE';

/** GET /partidos/{id} (HU-301): el partido con lo que hace falta para cargar, aceptar, objetar o laudar el resultado. */
export interface PartidoDetalle {
  id: number;
  torneoId: number;
  torneo: string;
  torneoSlug: string | null;
  ronda: number;
  /** "Final", "Semifinal"... como en el bracket. */
  nombreRonda: string;
  posicion: number;
  estado: EstadoPartido;
  bye: boolean;
  local: LadoBracket | null;
  visitante: LadoBracket | null;
  cancha: string | null;
  fechaProgramada: string | null;
  arbitro: string | null;
  /** El lado que cargó el resultado; el otro lo acepta u objeta. */
  cargadoPor: Lado | null;
  resultadoCargadoEn: string | null;
  /** Hasta cuándo el rival puede objetar; después se confirma solo. */
  objecionVenceEn: string | null;
  /** El lado del que es capitán quien consulta, si juega el partido. */
  miLado: Lado | null;
  /** Si lo objetaron (HU-302), con su laudo si ya se resolvió (HU-304). */
  objecion: ObjecionDetalle | null;
  /** Con el partido objetado, si quien consulta lo puede laudar: el organizador o un árbitro con permiso. */
  puedoResolver: boolean;
}

/** La objeción: quién objetó, por qué y el resultado que propone; y el laudo, si ya se resolvió. */
export interface ObjecionDetalle {
  lado: Lado;
  motivo: string;
  puntajeLocal: number;
  puntajeVisitante: number;
  penalesLocal: number | null;
  penalesVisitante: number | null;
  creadaEn: string;
  /** CONFIRMADO si quedó el resultado cargado, CORREGIDO si cambió; null hasta el laudo. */
  decision: 'CONFIRMADO' | 'CORREGIDO' | null;
  justificacion: string | null;
  /** Nombre y apellido de quien laudó. */
  resueltaPor: string | null;
  resueltaEn: string | null;
  /** La evidencia que citó el laudo. */
  evidenciaId: number | null;
  /** Sello SHA-256 del laudo (`selloDelLaudo`). */
  laudoHash: string | null;
}

/** Los penales solo con empate, y tienen que definir un ganador. */
export interface ResultadoPayload {
  puntajeLocal: number;
  puntajeVisitante: number;
  penalesLocal: number | null;
  penalesVisitante: number | null;
}

/** El resultado que propone quien objeta, con las reglas de la carga, y por qué. */
export interface ObjecionPayload extends ResultadoPayload {
  motivo: string;
}

/** El resultado oficial, con las reglas de la carga, la evidencia del partido en la que se basa y por qué. */
export interface LaudoPayload extends ResultadoPayload {
  justificacion: string;
  evidenciaId: number;
}

export interface EvidenciaDetalle {
  id: number;
  lado: Lado | null;
  /** El nombre del equipo o del jugador que la subió. */
  equipo: string | null;
  tipoContenido: string;
  tamanioBytes: number;
  hash: string;
  url: string;
  subidaEn: string;
}

export const partidoApi = {
  obtener: async (id: number): Promise<PartidoDetalle> => {
    return httpClient.get<PartidoDetalle>(`/partidos/${id}`);
  },

  /** El primer partido sin cerrar del torneo en el que juego; null si no hay (204). */
  miProximo: async (torneoId: number): Promise<PartidoDetalle | null> => {
    // el 204 vuelve como objeto vacío
    const partido = await httpClient.get<Partial<PartidoDetalle>>(
      `/torneos/${torneoId}/mi-proximo-partido`
    );
    return partido.id === undefined ? null : (partido as PartidoDetalle);
  },

  cargarResultado: async (id: number, payload: ResultadoPayload): Promise<PartidoDetalle> => {
    return httpClient.post<PartidoDetalle>(`/partidos/${id}/resultado`, payload);
  },

  /** El rival da por bueno el resultado: el partido queda confirmado y el ganador avanza. */
  aceptarResultado: async (id: number): Promise<PartidoDetalle> => {
    return httpClient.post<PartidoDetalle>(`/partidos/${id}/resultado/aceptar`);
  },

  /** La evidencia propia se sube antes: sin al menos una, el back responde 400 en `evidencia`. */
  objetarResultado: async (id: number, payload: ObjecionPayload): Promise<PartidoDetalle> => {
    return httpClient.post<PartidoDetalle>(`/partidos/${id}/objecion`, payload);
  },

  /** El partido queda confirmado o corregido y la llave avanza. */
  laudar: async (id: number, payload: LaudoPayload): Promise<PartidoDetalle> => {
    return httpClient.post<PartidoDetalle>(`/partidos/${id}/laudo`, payload);
  },

  evidencias: async (id: number): Promise<EvidenciaDetalle[]> => {
    return httpClient.get<EvidenciaDetalle[]>(`/partidos/${id}/evidencias`);
  },

  /** Foto (JPG, PNG o WEBP, hasta 5 MB) o video (MP4, MOV o WEBM, hasta 20 MB). */
  subirEvidencia: async (id: number, archivo: File): Promise<EvidenciaDetalle> => {
    const body = new FormData();
    body.append('archivo', archivo);
    return customFetch<EvidenciaDetalle>(`/partidos/${id}/evidencias`, { method: 'POST', body });
  },

  /** Pide la sesión, así que se baja con el token y se abre desde memoria. */
  archivoEvidencia: async (id: number, evidenciaId: number): Promise<Blob> => {
    return httpClient.get<Blob>(`/partidos/${id}/evidencias/${evidenciaId}/archivo`, {
      comoBlob: true,
    });
  },
};
