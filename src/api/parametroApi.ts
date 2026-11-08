import { httpClient } from './httpClient';

/** Los parámetros de la plataforma (HU-702), en el orden en que los devuelve el back. */
export type ClaveParametro =
  | 'GASTOS_ADMINISTRATIVOS'
  | 'GASTOS_ADMINISTRATIVOS_TOPE'
  | 'MARGEN_CIERRE_INICIO_MIN'
  | 'CHECKIN_DURACION_MAX_MIN'
  | 'RETIRO_MINIMO'
  | 'RETIRO_MAXIMO';

/** PORCENTAJE de 0 a 100; MINUTOS enteros; PESOS con hasta dos decimales. */
export type UnidadParametro = 'PORCENTAJE' | 'MINUTOS' | 'PESOS';

/** GET /admin/parametros. `modificadoPor` es el username de quien lo cambió, o SISTEMA. */
export interface ParametroDetalle {
  clave: ClaveParametro;
  unidad: UnidadParametro;
  valor: number;
  descripcion: string;
  modificadoEn: string;
  modificadoPor: string;
}

export const parametroApi = {
  listar: async (): Promise<ParametroDetalle[]> => {
    return httpClient.get<ParametroDetalle[]>('/admin/parametros');
  },

  /** Cambia los que vienen; si alguno no valida, no guarda ninguno (400 con un error por clave). */
  actualizar: async (
    valores: Partial<Record<ClaveParametro, number>>
  ): Promise<ParametroDetalle[]> => {
    return httpClient.put<ParametroDetalle[]>('/admin/parametros', { valores });
  },
};
