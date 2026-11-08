/**
 * La semilla de una rifa sale de drand (HU-503, PICA-264): es el `randomness` de una ronda, que drand
 * deriva como el SHA-256 de la firma de esa ronda. El portal lo comprueba en el navegador y consulta
 * la ronda directo en drand, sin pasar por la plataforma.
 */

/** Si la semilla es el SHA-256 de los bytes de la firma (en hexadecimal), como la deriva drand. */
export async function semillaEsDeLaFirma(semilla: string, firma: string): Promise<boolean> {
  if (!/^([0-9a-f]{2})+$/i.test(firma)) return false;
  const bytes = new Uint8Array(firma.match(/../g)!.map((par) => parseInt(par, 16)));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hex === semilla;
}

export type ConsultaDrand = 'coincide' | 'difiere' | 'sin-respuesta';

/** Pide la ronda a drand y la compara con la semilla y la firma que publica la plataforma. */
export async function consultarDrand(
  url: string,
  ronda: number,
  semilla: string,
  firma: string
): Promise<ConsultaDrand> {
  try {
    const respuesta = await fetch(url);
    if (!respuesta.ok) return 'sin-respuesta';
    const pulso: { round: number; randomness: string; signature: string } = await respuesta.json();
    return pulso.round === ronda && pulso.randomness === semilla && pulso.signature === firma
      ? 'coincide'
      : 'difiere';
  } catch {
    return 'sin-respuesta';
  }
}
