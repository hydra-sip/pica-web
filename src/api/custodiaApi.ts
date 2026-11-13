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

/** Una acreditación de la liquidación (HU-606). APORTE_RIFA: lo que la rifa aporta al pozo del torneo. */
export interface LineaReparto {
  /** HONORARIO: lo depositado para un árbitro (HU-604). */
  rol: 'PREMIO' | 'ORGANIZADOR' | 'PLATAFORMA' | 'HONORARIO';
  origen: 'TORNEO' | 'RIFA' | 'APORTE_RIFA';
  puesto?: number | null;
  /** Null en la plataforma. */
  beneficiarioNombre?: string | null;
  beneficiarioUsername?: string | null;
  equipoNombre?: string | null;
  monto: number;
  acreditadoEn: string;
}

/** Cómo se repartió la custodia al liquidarse (wireframe 64). Sin liquidar, sin líneas. */
export interface RepartoLiquidacion {
  liquidado: boolean;
  liquidadoEn?: string | null;
  total: number;
  moneda: string;
  lineas: LineaReparto[];
}

/**
 * HU-608: cómo viene la plata del torneo, con la cuenta de la liquidación. `reintegroOrganizador` son los gastos, hasta
 * lo recaudado; `comprometidoEnPremios` = `recaudado` - `reintegroOrganizador` + `aporteRifa`.
 */
export interface PanelFinanciero {
  torneoId: number;
  torneoNombre: string;
  estado: string;
  liquidado: boolean;
  liquidadoEn?: string | null;
  moneda: string;
  recaudado: number;
  gastosAdministrativos: number;
  aporteRifa: number;
  gastos: number;
  reintegroOrganizador: number;
  comprometidoEnPremios: number;
  /** Cuántas inscripciones pagaron. */
  pagos: number;
}

export type FormatoLiquidacion = 'csv' | 'pdf';

export const custodiaApi = {
  /** HU-608: el organizador o quien tiene TORNEO_ADMINISTRAR; de otro, 404. */
  panelFinanciero: async (torneoId: number): Promise<PanelFinanciero> =>
    httpClient.get<PanelFinanciero>(`/torneos/${torneoId}/panel-financiero`),

  /** HU-608: la liquidación final para descargar. Sin liquidar, 409 FONDOS_EN_CUSTODIA. */
  liquidacionFinal: async (torneoId: number, formato: FormatoLiquidacion): Promise<Blob> =>
    httpClient.get<Blob>(`/torneos/${torneoId}/liquidacion`, {
      params: { formato },
      comoBlob: true,
    }),

  /** Solo el organizador del evento; de otro, 404. */
  obtener: async (evento: EventoCustodia, id: number): Promise<CustodiaResumen> =>
    httpClient.get<CustodiaResumen>(`/${evento}/${id}/custodia`),

  /** El organizador intenta sacar la plata: siempre 409 (FONDOS_EN_CUSTODIA o CUSTODIA_LIBERADA). */
  retirar: async (evento: EventoCustodia, id: number): Promise<void> =>
    httpClient.post<void>(`/${evento}/${id}/custodia/retiro`),

  /** HU-606: el reparto de la liquidación; solo el organizador, de otro 404. */
  reparto: async (evento: EventoCustodia, id: number): Promise<RepartoLiquidacion> =>
    httpClient.get<RepartoLiquidacion>(`/${evento}/${id}/liquidacion`),

  /** Solo quien se inscribió; sin pago, 404 COMPROBANTE_NO_ENCONTRADO. */
  comprobanteDeInscripcion: async (inscripcionId: number): Promise<ComprobantePago> =>
    httpClient.get<ComprobantePago>(`/inscripciones/${inscripcionId}/comprobante`),
};
