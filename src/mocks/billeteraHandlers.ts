import { http, HttpResponse } from 'msw';
import {
  acreditarCargaCriptoMock,
  cargarSaldoMock,
  getCargaCriptoMock,
  iniciarCargaCriptoMock,
  getBilleteraMock,
  getMovimientosMock,
} from './data';
import { CargaRequest } from '../api/billeteraApi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

/** HU-603: la custodia de un torneo o una rifa, para su organizador, con una inscripción paga. */
const custodiaMock = {
  estado: 'RETENIDA',
  total: 22000,
  recaudado: 20000,
  gastosAdministrativos: 2000,
  pagos: 1,
  moneda: 'ARS',
  eventoTerminado: false,
  liberadaEn: null,
};

/** HU-606: el reparto de un evento que todavía no se liquidó. */
const sinLiquidar = { liquidado: false, liquidadoEn: null, total: 0, moneda: 'ARS', lineas: [] };

const fondosEnCustodia = () =>
  new HttpResponse(
    JSON.stringify({
      status: 409,
      codigo: 'FONDOS_EN_CUSTODIA',
      detail: 'Los fondos están en custodia hasta que el evento termine',
    }),
    { status: 409, headers: { 'Content-Type': 'application/problem+json' } }
  );

export const billeteraHandlers = [
  // GET /torneos/{id}/custodia y /rifas/{id}/custodia
  http.get(`${API_URL}/torneos/:id/custodia`, () => HttpResponse.json(custodiaMock)),
  http.get(`${API_URL}/rifas/:id/custodia`, () => HttpResponse.json(custodiaMock)),

  // GET /torneos/{id}/liquidacion y /rifas/{id}/liquidacion (HU-606): sin liquidar, sin líneas
  http.get(`${API_URL}/torneos/:id/liquidacion`, () => HttpResponse.json(sinLiquidar)),
  http.get(`${API_URL}/rifas/:id/liquidacion`, () => HttpResponse.json(sinLiquidar)),

  // POST .../custodia/retiro: antes del cierre, siempre 409
  http.post(`${API_URL}/torneos/:id/custodia/retiro`, fondosEnCustodia),
  http.post(`${API_URL}/rifas/:id/custodia/retiro`, fondosEnCustodia),

  // GET /billetera
  http.get(`${API_URL}/billetera`, () => {
    return HttpResponse.json(getBilleteraMock());
  }),

  // GET /billetera/movimientos
  http.get(`${API_URL}/billetera/movimientos`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '0', 10);
    const size = parseInt(url.searchParams.get('size') || '10', 10);

    const todos = getMovimientosMock();
    const totalElements = todos.length;
    const totalPages = Math.ceil(totalElements / size) || 0;
    const start = page * size;
    const content = todos.slice(start, start + size);

    return HttpResponse.json({
      content,
      page: {
        size,
        number: page,
        totalElements,
        totalPages,
      },
    });
  }),

  // POST /billetera/cargas/cripto (HU-609): la referencia y los wei a pagar en el contrato
  http.post(`${API_URL}/billetera/cargas/cripto`, async ({ request }) => {
    const { monto } = (await request.json()) as CargaRequest;
    return HttpResponse.json(iniciarCargaCriptoMock(monto), { status: 201 });
  }),

  // POST /billetera/cargas/cripto/{referencia}/confirmar: acredita con el hash, sin mirar la red
  http.post(`${API_URL}/billetera/cargas/cripto/:referencia/confirmar`, async ({ params, request }) => {
    const carga = getCargaCriptoMock(params.referencia as string);
    if (!carga) {
      return HttpResponse.json(
        { status: 404, codigo: 'CARGA_NO_ENCONTRADA', detail: 'No hay una carga con esa referencia' },
        { status: 404 }
      );
    }
    const { hash } = (await request.json()) as { hash: string };
    return HttpResponse.json(acreditarCargaCriptoMock(carga, hash));
  }),

  // POST /billetera/cargas
  http.post(`${API_URL}/billetera/cargas`, async ({ request }) => {
    const billetera = getBilleteraMock();
    if (billetera.estado === 'BLOQUEADA') {
      return new HttpResponse(
        JSON.stringify({
          status: 403,
          codigo: 'BILLETERA_BLOQUEADA',
          detail: 'Tu billetera se encuentra bloqueada.',
        }),
        { status: 403, headers: { 'Content-Type': 'application/problem+json' } }
      );
    }

    const body = (await request.json().catch(() => ({}))) as CargaRequest;
    const monto = Number(body.monto);

    if (isNaN(monto) || monto <= 0) {
      return new HttpResponse(
        JSON.stringify({
          status: 400,
          codigo: 'VALIDACION',
          detail: 'El monto a cargar debe ser mayor a 0.',
          errores: [
            {
              campo: 'monto',
              codigo: 'VALOR_INVALIDO',
              mensaje: 'El monto debe ser mayor a 0.',
            },
          ],
        }),
        { status: 400, headers: { 'Content-Type': 'application/problem+json' } }
      );
    }

    const movimientoCreado = cargarSaldoMock(monto, body.referencia);
    return HttpResponse.json(movimientoCreado, { status: 201 });
  }),
];

