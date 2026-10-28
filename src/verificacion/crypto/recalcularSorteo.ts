/**
 * Motor criptográfico para la recalculación independiente de sorteos en el navegador (HU-505, PICA-267).
 *
 * Utiliza Web Crypto API (SHA-256) nativo del navegador para garantizar cálculo determinístico,
 * auditable y de ejecución exclusivamente del lado del cliente.
 */

export async function calcularSha256(texto: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(texto);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface InscriptoEntrada {
  id: number;
  nombre: string;
}

export interface InscriptoConHash {
  id: number;
  nombre: string;
  hash: string;
  posicionOrden: number;
}

export interface CruceRecalculado {
  posicion: number;
  localId: number;
  localNombre: string;
  visitanteId: number | null;
  visitanteNombre: string | null;
  bye: boolean;
}

export interface RecalculoTorneoResultado {
  semilla: string;
  inscriptosCount: number;
  rondas: number;
  partidosPrimeraRonda: number;
  byes: number;
  posicionesConBye: number[];
  orden: InscriptoConHash[];
  cruces: CruceRecalculado[];
}

/**
 * Recalcula el bracket de eliminación directa a partir de la semilla y la lista de inscriptos.
 * Sigue el algoritmo determinístico idéntico a SorteoBracket.java:
 * 1. Ordena las inscripciones por SHA-256(semilla + ":" + id) de menor a mayor (desempate por id).
 * 2. Cuadro con potencia de 2 suficiente. Los lugares sobrantes son BYE.
 * 3. Los BYE van primero a las posiciones impares (1, 3, 5...) y luego pares (2, 4, 6...).
 * 4. Los demás inscriptos llenan los cruces restantes por orden de posición (local y visitante).
 */
export async function recalcularSorteoBracket(
  semilla: string,
  inscriptos: InscriptoEntrada[]
): Promise<RecalculoTorneoResultado> {
  if (inscriptos.length < 2) {
    throw new Error('Hacen falta al menos dos inscripciones para sortear');
  }

  // 1. Calcular el SHA-256 de cada participante
  const conHashes = await Promise.all(
    inscriptos.map(async (ins) => {
      const hash = await calcularSha256(`${semilla}:${ins.id}`);
      return {
        id: ins.id,
        nombre: ins.nombre,
        hash,
        posicionOrden: 0,
      };
    })
  );

  // Ordenar de menor a mayor por hash, desempatando por id numérico
  conHashes.sort((a, b) => {
    const cmp = a.hash.localeCompare(b.hash);
    if (cmp !== 0) return cmp;
    return a.id - b.id;
  });

  const orden: InscriptoConHash[] = conHashes.map((item, idx) => ({
    ...item,
    posicionOrden: idx + 1,
  }));

  // 2. Rondas, partidos y byes
  // Integer.numberOfLeadingZeros(orden.size() - 1) => Math.clz32(orden.length - 1)
  const rondas = 32 - Math.clz32(orden.length - 1);
  const partidos = 1 << (rondas - 1);
  const byes = (1 << rondas) - orden.length;

  // 3. Posiciones de los BYEs: primero impares, luego pares
  const conBye: number[] = [];
  for (let p = 1; p <= partidos; p++) {
    if (p % 2 === 1) conBye.push(p);
  }
  for (let p = 1; p <= partidos; p++) {
    if (p % 2 === 0) conBye.push(p);
  }
  const posicionesConBye = conBye.slice(0, byes);

  // 4. Llenar los cruces de primera ronda
  const cruces: (CruceRecalculado | null)[] = new Array(partidos).fill(null);
  let siguiente = 0;

  for (const posicion of posicionesConBye) {
    const ins = orden[siguiente++];
    cruces[posicion - 1] = {
      posicion,
      localId: ins.id,
      localNombre: ins.nombre,
      visitanteId: null,
      visitanteNombre: null,
      bye: true,
    };
  }

  for (let posicion = 1; posicion <= partidos; posicion++) {
    if (!cruces[posicion - 1]) {
      const local = orden[siguiente++];
      const visitante = orden[siguiente++];
      cruces[posicion - 1] = {
        posicion,
        localId: local.id,
        localNombre: local.nombre,
        visitanteId: visitante.id,
        visitanteNombre: visitante.nombre,
        bye: false,
      };
    }
  }

  return {
    semilla,
    inscriptosCount: inscriptos.length,
    rondas,
    partidosPrimeraRonda: partidos,
    byes,
    posicionesConBye,
    orden,
    cruces: cruces as CruceRecalculado[],
  };
}

export interface PremioEntrada {
  puesto: number;
  descripcion?: string | null;
  pct: number;
}

export interface NumeroConHash {
  numero: number;
  hash: string;
  posicionOrden: number;
}

export interface GanadorRecalculado {
  puesto: number;
  descripcion: string;
  pct: number;
  numeroGanador: number | null;
  hashGanador: string | null;
}

export interface RecalculoRifaResultado {
  semilla: string;
  hashSemillaCalculado: string;
  compromisoHashEsperado: string;
  compromisoCoincide: boolean;
  numerosTotal: number;
  orden: NumeroConHash[];
  ganadores: GanadorRecalculado[];
}

/**
 * Recalcula el sorteo de una rifa:
 * 1. Comprueba que SHA-256(semilla) coincida con el compromiso_hash publicado con anterioridad.
 * 2. Ordena los números vendidos mediante SHA-256(semilla + ":" + numero) de menor a mayor.
 * 3. Asigna los números ganadores en orden de posición a los premios establecidos.
 */
export async function recalcularSorteoRifa(
  semilla: string,
  compromisoHash: string,
  numerosVendidos: number[],
  premios: PremioEntrada[]
): Promise<RecalculoRifaResultado> {
  const hashSemillaCalculado = await calcularSha256(semilla);
  const compromisoCoincide =
    hashSemillaCalculado.toLowerCase() === compromisoHash.trim().toLowerCase();

  // Calcular el hash de cada número vendido
  const conHashes = await Promise.all(
    numerosVendidos.map(async (num) => {
      const hash = await calcularSha256(`${semilla}:${num}`);
      return {
        numero: num,
        hash,
        posicionOrden: 0,
      };
    })
  );

  conHashes.sort((a, b) => {
    const cmp = a.hash.localeCompare(b.hash);
    if (cmp !== 0) return cmp;
    return a.numero - b.numero;
  });

  const orden: NumeroConHash[] = conHashes.map((item, idx) => ({
    ...item,
    posicionOrden: idx + 1,
  }));

  const premiosOrdenados = [...premios].sort((a, b) => a.puesto - b.puesto);

  const ganadores: GanadorRecalculado[] = premiosOrdenados.map((premio, idx) => {
    const item = orden[idx];
    return {
      puesto: premio.puesto,
      descripcion: premio.descripcion || `Premio ${premio.puesto}`,
      pct: premio.pct,
      numeroGanador: item ? item.numero : null,
      hashGanador: item ? item.hash : null,
    };
  });

  return {
    semilla,
    hashSemillaCalculado,
    compromisoHashEsperado: compromisoHash,
    compromisoCoincide,
    numerosTotal: numerosVendidos.length,
    orden,
    ganadores,
  };
}
