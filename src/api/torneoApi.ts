import { httpClient } from './httpClient';

export type TipoParticipante = 'INDIVIDUAL' | 'EQUIPO';

/**
 * El torneo que necesita la inscripción.
 *
 * TODO (PICA-196): FORMA PROVISIONAL. El endpoint público del torneo por slug todavía no está en
 * openapi.yaml; los nombres son los de la entidad del back. Cuando se publique el contrato hay que
 * confirmar la ruta, los campos y los tipos con Salvador, y ajustar este tipo y los mocks.
 */
export interface Torneo {
  id: number;
  slug: string;
  nombre: string;
  tipoParticipante: TipoParticipante;
  cupoMaximo: number;
  cupoMinimo: number;
  /** Jugadores mínimos de la nómina (el capitán incluido); en uno individual no aplica. */
  tamanioEquipo: number | null;
  /** Jugadores máximos de la nómina (el capitán incluido); en uno individual no aplica. */
  nominaMaxima: number | null;
  /** Lo que cuesta inscribirse; 0 es gratis. */
  valorInscripcion: number;
  moneda: string;
  cierreInscripcionEn: string;
  /** Enlace al PDF del reglamento. */
  reglamentoUrl: string | null;
  estado: string;
}

export const torneoApi = {
  // TODO (PICA-196): ruta provisional.
  obtenerPorSlug: async (slug: string): Promise<Torneo> => {
    return httpClient.get<Torneo>(`/torneos/slug/${encodeURIComponent(slug)}`);
  },
};
