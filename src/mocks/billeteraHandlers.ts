import { http, HttpResponse } from 'msw';
import {
  acreditarCargaCriptoMock,
  cargarSaldoMock,
  getCargaCriptoMock,
  iniciarCargaCriptoMock,
  getBilleteraMock,
  getMovimientosMock,
  getCuentasBancariasMock,
  setCuentasBancariasMock,
  getLimitesRetiroMock,
  setBilleteraMock,
  setMovimientosMock,
} from './data';
import {
  CargaRequest,
  CrearCuentaBancariaRequest,
  CuentaBancaria,
  MovimientoBilletera,
  SolicitarRetiroRequest,
} from '../api/billeteraApi';
import { getUsuarioActualMock } from './handlers';

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

  // GET /billetera/cuentas (HU-607)
  http.get(`${API_URL}/billetera/cuentas`, () => {
    return HttpResponse.json(getCuentasBancariasMock());
  }),

  // POST /billetera/cuentas (HU-607)
  http.post(`${API_URL}/billetera/cuentas`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Partial<CrearCuentaBancariaRequest>;
    const errores: { campo: string; codigo: string; mensaje: string }[] = [];

    if (!body.tipo || !['CBU', 'CVU', 'ALIAS'].includes(body.tipo)) {
      errores.push({
        campo: 'tipo',
        codigo: 'FORMATO_INVALIDO',
        mensaje: 'El tipo debe ser CBU, CVU o ALIAS.',
      });
    }

    const valor = (body.valor || '').trim();
    if (!valor) {
      errores.push({
        campo: 'valor',
        codigo: 'REQUERIDO',
        mensaje: 'El valor es obligatorio.',
      });
    } else if (body.tipo === 'CBU' || body.tipo === 'CVU') {
      if (!/^\d{22}$/.test(valor)) {
        errores.push({
          campo: 'valor',
          codigo: 'FORMATO_INVALIDO',
          mensaje: 'Debe contener exactamente 22 dígitos.',
        });
      }
    } else if (body.tipo === 'ALIAS') {
      if (!/^[a-zA-Z0-9.-]{6,20}$/.test(valor)) {
        errores.push({
          campo: 'valor',
          codigo: 'FORMATO_INVALIDO',
          mensaje: 'Debe tener entre 6 y 20 caracteres alfanuméricos, puntos o guiones.',
        });
      }
    }

    const titular = (body.titular || '').trim();
    if (!titular) {
      errores.push({
        campo: 'titular',
        codigo: 'REQUERIDO',
        mensaje: 'El nombre del titular es obligatorio.',
      });
    }

    const cuitCuil = (body.cuitCuil || '').trim();
    if (!cuitCuil) {
      errores.push({
        campo: 'cuitCuil',
        codigo: 'REQUERIDO',
        mensaje: 'El CUIT/CUIL es obligatorio.',
      });
    } else if (!/^\d{11}$/.test(cuitCuil)) {
      errores.push({
        campo: 'cuitCuil',
        codigo: 'FORMATO_INVALIDO',
        mensaje: 'El CUIT/CUIL debe contener exactamente 11 dígitos.',
      });
    }

    if (errores.length > 0) {
      return new HttpResponse(
        JSON.stringify({
          status: 400,
          codigo: 'VALIDACION',
          detail: 'Revisá los campos marcados.',
          errores,
        }),
        { status: 400, headers: { 'Content-Type': 'application/problem+json' } }
      );
    }

    // Validar coincidencia de DNI con el usuario logueado
    const usuarioActual = getUsuarioActualMock();
    const dniUsuario = (usuarioActual?.persona?.nroDoc || '38123456').replace(/\D/g, '');
    const dniEnCuil = cuitCuil.slice(2, 10).replace(/^0+/, '');
    const dniLimpio = dniUsuario.replace(/^0+/, '');

    if (!cuitCuil.includes(dniUsuario) && dniEnCuil !== dniLimpio) {
      return new HttpResponse(
        JSON.stringify({
          status: 409,
          codigo: 'CUENTA_TITULAR_NO_COINCIDE',
          detail: 'La cuenta destino debe estar a nombre del titular verificado en la plataforma',
        }),
        { status: 409, headers: { 'Content-Type': 'application/problem+json' } }
      );
    }

    // Validar duplicado
    const cuentas = getCuentasBancariasMock();
    if (cuentas.some((c) => c.valor.toUpperCase() === valor.toUpperCase())) {
      return new HttpResponse(
        JSON.stringify({
          status: 409,
          codigo: 'CUENTA_BANCARIA_DUPLICADA',
          detail: 'Ya tenés una cuenta bancaria registrada con ese CBU, CVU o alias.',
        }),
        { status: 409, headers: { 'Content-Type': 'application/problem+json' } }
      );
    }

    const nuevaCuenta: CuentaBancaria = {
      id: Date.now(),
      tipo: body.tipo as 'CBU' | 'CVU' | 'ALIAS',
      valor,
      titular,
      cuitCuil,
      estadoValidacion: 'VALIDADA',
      validadaEn: new Date().toISOString(),
      creadoEn: new Date().toISOString(),
    };

    setCuentasBancariasMock([...cuentas, nuevaCuenta]);
    return HttpResponse.json(nuevaCuenta, { status: 201 });
  }),

  // DELETE /billetera/cuentas/:id (HU-607)
  http.delete(`${API_URL}/billetera/cuentas/:id`, ({ params }) => {
    const id = Number(params.id);
    const cuentas = getCuentasBancariasMock();
    if (!cuentas.some((c) => c.id === id)) {
      return new HttpResponse(
        JSON.stringify({
          status: 404,
          codigo: 'CUENTA_BANCARIA_NO_ENCONTRADA',
          detail: 'Cuenta bancaria no encontrada.',
        }),
        { status: 404, headers: { 'Content-Type': 'application/problem+json' } }
      );
    }

    setCuentasBancariasMock(cuentas.filter((c) => c.id !== id));
    return new HttpResponse(null, { status: 204 });
  }),

  // GET /billetera/retiros/limites (HU-607)
  http.get(`${API_URL}/billetera/retiros/limites`, () => {
    return HttpResponse.json(getLimitesRetiroMock());
  }),

  // POST /billetera/retiros (HU-607)
  http.post(`${API_URL}/billetera/retiros`, async ({ request }) => {
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

    const body = (await request.json().catch(() => ({}))) as Partial<SolicitarRetiroRequest>;
    const monto = Number(body.monto);
    const cuentaId = Number(body.cuentaId);

    if (isNaN(monto) || monto <= 0 || !cuentaId) {
      return new HttpResponse(
        JSON.stringify({
          status: 400,
          codigo: 'VALIDACION',
          detail: 'Datos de retiro inválidos.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/problem+json' } }
      );
    }

    const limites = getLimitesRetiroMock();
    if (monto < limites.minimo || monto > limites.maximo) {
      return new HttpResponse(
        JSON.stringify({
          status: 400,
          codigo: 'RETIRO_FUERA_DE_TOPES',
          detail: `El monto a retirar debe estar entre $${limites.minimo} y $${limites.maximo}`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/problem+json' } }
      );
    }

    const cuentas = getCuentasBancariasMock();
    const cuenta = cuentas.find((c) => c.id === cuentaId);
    if (!cuenta) {
      return new HttpResponse(
        JSON.stringify({
          status: 404,
          codigo: 'CUENTA_BANCARIA_NO_ENCONTRADA',
          detail: 'Cuenta bancaria no encontrada o no pertenece al usuario.',
        }),
        { status: 404, headers: { 'Content-Type': 'application/problem+json' } }
      );
    }

    if (cuenta.estadoValidacion !== 'VALIDADA') {
      return new HttpResponse(
        JSON.stringify({
          status: 409,
          codigo: 'CUENTA_NO_VALIDADA',
          detail: 'Solo se puede solicitar retiros a una cuenta bancaria validada',
        }),
        { status: 409, headers: { 'Content-Type': 'application/problem+json' } }
      );
    }

    if (monto > billetera.saldoDisponible) {
      return new HttpResponse(
        JSON.stringify({
          status: 409,
          codigo: 'SALDO_INSUFICIENTE',
          detail:
            'El saldo disponible no alcanza para el retiro solicitado. Los fondos retenidos no pueden ser movilizados',
        }),
        { status: 409, headers: { 'Content-Type': 'application/problem+json' } }
      );
    }

    const nuevoSaldo = billetera.saldoDisponible - monto;
    setBilleteraMock({ saldoDisponible: nuevoSaldo });

    const nuevoMovimiento: MovimientoBilletera = {
      id: Date.now(),
      tipo: 'RETIRO',
      monto,
      moneda: billetera.moneda,
      saldoResultante: nuevoSaldo,
      estado: 'PENDIENTE',
      referenciaExterna: `sim-retiro-${Math.random().toString(36).substring(2, 10)}`,
      descripcion: `Retiro a cuenta ${cuenta.tipo} ${cuenta.valor}`,
      torneo: null,
      rifa: null,
      creadoEn: new Date().toISOString(),
    };

    setMovimientosMock([nuevoMovimiento, ...getMovimientosMock()]);
    return HttpResponse.json(nuevoMovimiento, { status: 201 });
  }),
];

