import { calcularSha256 } from './recalcularSorteo';

/**
 * El sorteo de los grupos (CR-02-9), igual que SorteoGrupos.java (versión 1):
 * 1. Cada inscripción se ordena por SHA-256(semilla + ":" + id) en hexadecimal, de menor a mayor (y por id si dos
 *    dieran igual): el mismo orden que la llave.
 * 2. Se reparte en serpentina: A, B, C, D, D, C, B, A, A, B…
 * La semilla es el `randomness` de la ronda de drand fijada al cerrar la inscripción, con el compromiso
 * SHA-256(listaHash + ":" + ronda) publicado antes.
 */
export interface OrdenGrupos {
  id: number;
  hash: string;
  /** La letra que le toca. */
  letra: string;
}

export interface RecalculoGrupos {
  orden: OrdenGrupos[];
  /** Por grupo (A, B, C…), las inscripciones en el orden en que salieron. */
  grupos: number[][];
}

export const letraDeGrupo = (indice: number): string => String.fromCharCode(65 + indice);

export async function recalcularSorteoGrupos(
  semilla: string,
  inscripciones: number[],
  cantidadGrupos: number
): Promise<RecalculoGrupos> {
  if (cantidadGrupos < 1) throw new Error('Hace falta al menos un grupo');
  const conHash = await Promise.all(
    inscripciones.map(async (id) => ({ id, hash: await calcularSha256(`${semilla}:${id}`) }))
  );
  conHash.sort((a, b) => (a.hash < b.hash ? -1 : a.hash > b.hash ? 1 : a.id - b.id));
  const grupos: number[][] = Array.from({ length: cantidadGrupos }, () => []);
  const orden = conHash.map((item, i) => {
    const vuelta = Math.floor(i / cantidadGrupos);
    const lugar = i % cantidadGrupos;
    const grupo = vuelta % 2 === 0 ? lugar : cantidadGrupos - 1 - lugar;
    grupos[grupo].push(item.id);
    return { ...item, letra: letraDeGrupo(grupo) };
  });
  return { orden, grupos };
}

/** Si el compromiso publicado al cerrar la inscripción es el de esa lista y esa ronda. */
export async function compromisoCoincide(
  listaHash: string,
  ronda: number,
  compromiso: string
): Promise<boolean> {
  return (await calcularSha256(`${listaHash}:${ronda}`)) === compromiso;
}
