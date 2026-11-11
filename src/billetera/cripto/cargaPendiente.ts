/**
 * Las cargas con cripto que ya se pagaron y el back todavía no acreditó (HU-609). Se guardan por usuario al tener
 * el hash, para retomarlas si se cierra la pestaña antes de que se acrediten: sin el hash, el back no puede
 * acreditar lo que ya está pagado en el contrato. Es una lista porque se puede pagar otra mientras una se demora.
 */
export interface CargaPendiente {
  referencia: string;
  hash: string;
  montoPesos: number;
}

const clave = (usuarioId: number | string) => `pica.cargaCripto.${usuarioId}`;

// el almacenamiento puede no estar (navegación privada, datos bloqueados): sin él, no se retoma
export const leerCargasPendientes = (usuarioId: number | string): CargaPendiente[] => {
  try {
    const guardadas = JSON.parse(localStorage.getItem(clave(usuarioId)) ?? '[]');
    return Array.isArray(guardadas) ? guardadas : [];
  } catch {
    return [];
  }
};

const escribir = (usuarioId: number | string, cargas: CargaPendiente[]) => {
  try {
    if (cargas.length) localStorage.setItem(clave(usuarioId), JSON.stringify(cargas));
    else localStorage.removeItem(clave(usuarioId));
  } catch {
    // sin almacenamiento, la carga solo se puede confirmar mientras el modal sigue abierto
  }
};

export const guardarCargaPendiente = (usuarioId: number | string, carga: CargaPendiente) => {
  const otras = leerCargasPendientes(usuarioId).filter((c) => c.referencia !== carga.referencia);
  escribir(usuarioId, [...otras, carga]);
};

export const borrarCargaPendiente = (usuarioId: number | string, referencia: string) => {
  escribir(
    usuarioId,
    leerCargasPendientes(usuarioId).filter((c) => c.referencia !== referencia)
  );
};
