import { httpClient } from './httpClient';

/** Los parámetros de la plataforma (HU-702), en el orden en que los devuelve el back. */
export type ClaveParametro =
  | 'GASTOS_ADMINISTRATIVOS'
  | 'GASTOS_ADMINISTRATIVOS_TOPE'
  | 'MARGEN_CIERRE_INICIO_MIN'
  | 'CHECKIN_DURACION_MAX_MIN'
  | 'RETIRO_MINIMO'
  | 'RETIRO_MAXIMO'
  | 'FAIR_PLAY_INICIAL'
  | 'FAIR_PLAY_MAXIMO'
  | 'FAIR_PLAY_CHECKIN'
  | 'FAIR_PLAY_AUSENCIA'
  | 'FAIR_PLAY_SANCION_LEVE'
  | 'FAIR_PLAY_SANCION_MEDIA'
  | 'FAIR_PLAY_SANCION_GRAVE'
  | 'FRAUDE_RIFA_NUMEROS_MAX'
  | 'FRAUDE_RIFA_VENTANA_MIN'
  | 'FRAUDE_CARRUSEL_OPERACIONES_MIN'
  | 'FRAUDE_CARRUSEL_VENTANA_MIN'
  | 'FRAUDE_CANCELACIONES_MIN'
  | 'FRAUDE_OBJECIONES_MIN'
  | 'FRAUDE_CUENTAS_USUARIOS_MIN';

/** PORCENTAJE de 0 a 100; MINUTOS enteros; PESOS con hasta dos decimales; PUNTOS enteros de 0 a 1000 (HU-802); CANTIDAD enteros positivos (HU-705). */
export type UnidadParametro = 'PORCENTAJE' | 'MINUTOS' | 'PESOS' | 'PUNTOS' | 'CANTIDAD';

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
