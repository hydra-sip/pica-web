import { httpClient } from './httpClient';

/** RETENIDA hasta que el evento termina; LIBERADA por la liquidación; REINTEGRADA si se canceló (HU-603). */
export type EstadoCustodia = 'RETENIDA' | 'LIBERADA' | 'REINTEGRADA';

/** La custodia de un torneo o una rifa, para su organizador. `total` = `recaudado` + `gastosAdministrativos`. */
export interface CustodiaResumen {
  estado: EstadoCustodia;
  total: number;
  recaudado: number;
  gastosAdministrativos: number;
  /** Cuántos pagos entraron, sin contar los de gastos. */
  pagos: number;
  moneda: string;
  eventoTerminado: boolean;
  liberadaEn?: string | null;
}

/** El comprobante del pago de una inscripción. El de una compra de números es su ticket. */
export interface ComprobantePago {
  numero: string;
  pagadoEn: string;
  pagadorNombre: string;
  pagadorUsername: string;
  concepto: string;
  torneoId: number;
  torneoNombre: string;
  equipoNombre?: string | null;
  monto: number;
  gastosAdministrativos: number;
  total: number;
  moneda: string;
  custodia?: EstadoCustodia | null;
}

export type EventoCustodia = 'torneos' | 'rifas';

export const custodiaApi = {
  /** Solo el organizador del evento; de otro, 404. */
  obtener: async (evento: EventoCustodia, id: number): Promise<CustodiaResumen> =>
    httpClient.get<CustodiaResumen>(`/${evento}/${id}/custodia`),

  /** El organizador intenta sacar la plata: siempre 409 (FONDOS_EN_CUSTODIA o CUSTODIA_LIBERADA). */
  retirar: async (evento: EventoCustodia, id: number): Promise<void> =>
    httpClient.post<void>(`/${evento}/${id}/custodia/retiro`),

  /** Solo quien se inscribió; sin pago, 404 COMPROBANTE_NO_ENCONTRADO. */
  comprobanteDeInscripcion: async (inscripcionId: number): Promise<ComprobantePago> =>
    httpClient.get<ComprobantePago>(`/inscripciones/${inscripcionId}/comprobante`),
};
