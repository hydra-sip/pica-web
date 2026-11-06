import { http, HttpResponse } from 'msw';
import type { ClaveParametro, ParametroDetalle } from '../api/parametroApi';
import { ErrorCampo, validacion } from './adminHandlers';

// Parámetros de la plataforma en memoria (HU-702), con los valores de las migraciones V26, V33 y V35 del back
// y las mismas reglas de PUT /admin/parametros. Se reinician entre test y test.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const iniciales = (): ParametroDetalle[] =>
  (
    [
      [
        'GASTOS_ADMINISTRATIVOS',
        'PORCENTAJE',
        10,
        '% de gastos administrativos que paga aparte quien se inscribe en un torneo o compra un número de rifa',
      ],
      [
        'GASTOS_ADMINISTRATIVOS_TOPE',
        'PORCENTAJE',
        20,
        'Tope del % de gastos administrativos: el % vigente no puede superarlo',
      ],
      [
        'MARGEN_CIERRE_INICIO_MIN',
        'MINUTOS',
        60,
        'Minutos que tienen que pasar como mínimo entre el cierre de la inscripción y el inicio del torneo',
      ],
      [
        'CHECKIN_DURACION_MAX_MIN',
        'MINUTOS',
        60,
        'Minutos que puede durar como máximo la ventana de check-in que configura el organizador',
      ],
      ['RETIRO_MINIMO', 'PESOS', 1000, 'Monto mínimo en pesos de un retiro de la billetera'],
      ['RETIRO_MAXIMO', 'PESOS', 500000, 'Monto máximo en pesos de un retiro de la billetera'],
    ] as const
  ).map(([clave, unidad, valor, descripcion]) => ({
    clave,
    unidad,
    valor,
    descripcion,
    modificadoEn: '2026-11-01T12:00:00Z',
    modificadoPor: 'SISTEMA',
  }));

let parametros = iniciales();

export const resetParametrosMock = () => {
  parametros = iniciales();
};

const decimales = (n: number) => (String(n).split('.')[1] ?? '').length;

/** Las reglas del back: rango de cada unidad y las dos reglas entre parámetros. */
const errores = (pedidos: Record<string, unknown>): ErrorCampo[] => {
  const lista: ErrorCampo[] = [];
  const resultado = new Map(parametros.map((p) => [p.clave as string, p.valor]));
  Object.entries(pedidos).forEach(([clave, valor]) => {
    const p = parametros.find((x) => x.clave === clave);
    if (!p) {
      lista.push({
        campo: clave,
        codigo: 'VALOR_INVALIDO',
        mensaje: 'No es un parámetro de la plataforma',
      });
      return;
    }
    if (typeof valor !== 'number') {
      lista.push({ campo: clave, codigo: 'REQUERIDO', mensaje: 'Falta el valor' });
      return;
    }
    if (p.unidad === 'PORCENTAJE' && (valor < 0 || valor > 100)) {
      lista.push({
        campo: clave,
        codigo: 'RANGO_INVALIDO',
        mensaje: 'Tiene que estar entre 0 y 100',
      });
    } else if (p.unidad === 'MINUTOS' && !Number.isInteger(valor)) {
      lista.push({ campo: clave, codigo: 'FORMATO_INVALIDO', mensaje: 'Son minutos enteros' });
    } else if (
      clave === 'MARGEN_CIERRE_INICIO_MIN' ? valor < 0 : p.unidad !== 'PORCENTAJE' && valor <= 0
    ) {
      lista.push({
        campo: clave,
        codigo: 'RANGO_INVALIDO',
        mensaje:
          clave === 'MARGEN_CIERRE_INICIO_MIN'
            ? 'No puede ser negativo'
            : 'Tiene que ser mayor que 0',
      });
    } else if (decimales(valor) > 2) {
      lista.push({ campo: clave, codigo: 'FORMATO_INVALIDO', mensaje: 'Hasta dos decimales' });
    }
    resultado.set(clave, valor);
  });
  if (lista.length) return lista;

  const noSupera = (
    menor: ClaveParametro,
    mayor: ClaveParametro,
    mMenor: string,
    mMayor: string
  ) => {
    if ((resultado.get(menor) ?? 0) <= (resultado.get(mayor) ?? 0)) return;
    lista.push(
      mayor in pedidos
        ? { campo: mayor, codigo: 'RANGO_INVALIDO', mensaje: mMayor }
        : { campo: menor, codigo: 'RANGO_INVALIDO', mensaje: mMenor }
    );
  };
  noSupera(
    'GASTOS_ADMINISTRATIVOS',
    'GASTOS_ADMINISTRATIVOS_TOPE',
    'No puede superar el tope',
    'No puede ser menor que el % vigente de gastos administrativos'
  );
  noSupera(
    'RETIRO_MINIMO',
    'RETIRO_MAXIMO',
    'No puede superar el retiro máximo',
    'No puede ser menor que el retiro mínimo'
  );
  return lista;
};

export const parametroHandlers = [
  http.get(`${API_URL}/admin/parametros`, () => HttpResponse.json(parametros)),

  http.put(`${API_URL}/admin/parametros`, async ({ request }) => {
    const cuerpo = (await request.json().catch(() => ({}))) as {
      valores?: Record<string, unknown>;
    };
    const pedidos = cuerpo.valores ?? {};
    if (Object.keys(pedidos).length === 0) {
      return validacion([
        { campo: 'valores', codigo: 'REQUERIDO', mensaje: 'No puede estar vacío' },
      ]);
    }
    const lista = errores(pedidos);
    if (lista.length) return validacion(lista);
    parametros = parametros.map((p) =>
      p.clave in pedidos && pedidos[p.clave] !== p.valor
        ? {
            ...p,
            valor: pedidos[p.clave] as number,
            modificadoEn: new Date().toISOString(),
            modificadoPor: 'admin',
          }
        : p
    );
    return HttpResponse.json(parametros);
  }),
];
