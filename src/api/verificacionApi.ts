import { BracketTorneo, torneoApi } from './torneoApi';

export type TipoSorteo = 'TORNEO' | 'RIFA';

/** Un torneo con el bracket sorteado, para elegirlo en el portal. */
export interface SorteoItemResumen {
  id: number;
  tipo: TipoSorteo;
  titulo: string;
  disciplinaOInfo: string;
}

export interface InscriptoVerificacion {
  id: number;
  nombre: string;
}

export interface CruceOficial {
  posicion: number;
  localId: number;
  localNombre: string;
  visitanteId: number | null;
  visitanteNombre: string | null;
  bye: boolean;
}

/**
 * Lo que se verifica de un torneo, armado con GET /torneos/{id}/bracket (público). Los inscriptos son las
 * inscripciones de la primera ronda: el sorteo las ordena por SHA-256(semilla + ":" + inscripcionId).
 */
export interface TorneoVerificacionData {
  id: number;
  semilla: string;
  /** SHA-256 de la nómina, sellada al cerrar la inscripción. */
  listaHash: string | null;
  inscriptos: InscriptoVerificacion[];
  resultadoOficial: {
    rondas: number;
    cruces: CruceOficial[];
  };
}

// La rifa espera GET /rifas/{id}/sorteo (PICA-263): VerificacionRifa ya está armada para esos datos.
export interface PremioRifaOficial {
  puesto: number;
  descripcion: string;
  pct: number;
  numeroGanador: number;
}

export interface RifaVerificacionData {
  id: number;
  titulo: string;
  torneoNombre: string | null;
  fechaSorteo: string;
  compromisoHash: string;
  listaHash: string;
  semilla: string;
  semillaFirma: string;
  numerosVendidos: number[];
  premios: PremioRifaOficial[];
  resultadoOficial: {
    ganadores: PremioRifaOficial[];
  };
}

/** Los cruces de la primera ronda del bracket; sin sortear, error. */
export function torneoDesdeBracket(bracket: BracketTorneo): TorneoVerificacionData {
  const primera = bracket.rondas.find((r) => r.numero === 1);
  if (!bracket.semilla || !primera || primera.partidos.some((p) => !p.local)) {
    throw new Error('Este torneo todavía no tiene el bracket sorteado.');
  }
  const cruces: CruceOficial[] = [...primera.partidos]
    .sort((a, b) => a.posicion - b.posicion)
    .map((p) => ({
      posicion: p.posicion,
      localId: p.local!.inscripcionId,
      localNombre: p.local!.nombre,
      visitanteId: p.visitante?.inscripcionId ?? null,
      visitanteNombre: p.visitante?.nombre ?? null,
      bye: p.bye,
    }));
  const inscriptos = cruces.flatMap((c) =>
    c.visitanteId === null
      ? [{ id: c.localId, nombre: c.localNombre }]
      : [
          { id: c.localId, nombre: c.localNombre },
          { id: c.visitanteId, nombre: c.visitanteNombre ?? '' },
        ]
  );
  return {
    id: bracket.torneoId,
    semilla: bracket.semilla,
    listaHash: bracket.listaHash,
    inscriptos,
    resultadoOficial: { rondas: bracket.rondas.length, cruces },
  };
}

export const verificacionApi = {
  /** Los torneos con el bracket sorteado: en curso o finalizados, del catálogo público. */
  listarTorneos: async (): Promise<SorteoItemResumen[]> => {
    const paginas = await Promise.all(
      (['EN_CURSO', 'FINALIZADO'] as const).map((estado) =>
        torneoApi.getTorneosResumen({ estado, size: 50 })
      )
    );
    return paginas
      .flatMap((p) => p.content)
      .map(
        (t): SorteoItemResumen => ({
          id: t.id,
          tipo: 'TORNEO',
          titulo: t.nombre,
          disciplinaOInfo: t.disciplina,
        })
      );
  },

  obtenerTorneo: async (id: number | string): Promise<TorneoVerificacionData> => {
    return torneoDesdeBracket(await torneoApi.bracket(Number(id)));
  },
};
