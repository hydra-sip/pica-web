import { http, HttpResponse } from 'msw';
import {
  cargarSaldoMock,
  getBilleteraMock,
  getMovimientosMock,
} from './data';
import { CargaRequest } from '../api/billeteraApi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export const billeteraHandlers = [
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

