import { RifaDetalle } from '../../api/rifaApi';

/**
 * Lo que expone cada paso del asistente que guarda (datos generales y premios) para que la página lo
 * valide y lo guarde antes de cambiar de paso, sea con Siguiente, Anterior o la barra de pasos.
 */
export interface PasoGuardable {
  /**
   * Valida y guarda si hubo cambios. Devuelve la rifa guardada (o la misma si no había nada que
   * guardar, o si es de solo lectura) y null si hay errores: en ese caso el paso los marca y la
   * página no cambia de pantalla.
   */
  guardar: () => Promise<RifaDetalle | null>;
}
