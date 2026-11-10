import { http, HttpResponse } from 'msw';
import { CancelacionDelTorneo } from '../api/cancelacionApi';
import { EstadoTorneo, TorneoInformacion } from '../api/torneoApi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

/** HU-605: el torneo de la consola donde se prueba la cancelación; lo recaudado coincide con la custodia de los mocks. */
export const TORNEO_A_CANCELAR = 7;
const POZO = 20000;
const PCT_MAXIMO = 20;
const MAXIMO = (POZO * PCT_MAXIMO) / 100;

const torneoBase: TorneoInformacion = {
  id: TORNEO_A_CANCELAR,
  nombre: 'Apertura F5',
  disciplina: 'Fútbol 5',
  descripcion: null,
  formato: 'ELIMINACION_DIRECTA',
  modalidad: 'PRESENCIAL',
  tipoParticipante: 'EQUIPO',
  sede: 'Club Mercedes',
  canchas: ['Cancha 1'],
  fechaInicio: '2026-12-01T15:00:00Z',
  fechaFin: null,
  cierreInscripcionEn: '2026-11-25T12:00:00Z',
  reglamentoTexto: 'Reglamento',
  cupoMaximo: 16,
  cupoMinimo: 4,
  tamanioEquipo: 5,
  nominaMaxima: 8,
  estado: 'EN_CURSO',
  pasoPendiente: null,
  reglamentoUrl: null,
  reglamentoHash: null,
  slug: 'apertura-f5',
  esquemaHash: null,
  publicadoEn: '2026-11-01T10:00:00Z',
  inscripcionCerradaEn: '2026-11-25T12:00:00Z',
  listaHash: null,
  creadoEn: '2026-10-30T10:00:00Z',
  modificadoEn: '2026-10-30T10:00:00Z',
  camposBloqueados: [],
  checkinMinAntes: null,
  checkinDuracion: null,
  checkinSinPresentes: 'REPROGRAMAR',
  economia: {
    valorInscripcion: 20000,
    moneda: 'ARS',
    pctGastosAdministrativos: 10,
    gastosAdministrativos: 2000,
    totalAPagar: 22000,
    premios: [{ puesto: 1, pct: 100 }],
  },
};

let estadoTorneo: EstadoTorneo = torneoBase.estado;
let cancelacion: CancelacionDelTorneo | null = null;

const sinCancelar = (): CancelacionDelTorneo => ({
  pozo: POZO,
  pctMaximo: PCT_MAXIMO,
  maximoGastos: MAXIMO,
  estado: null,
  motivo: null,
  pedidaEn: null,
  gastos: [],
  totalGastos: 0,
  revisadaEn: null,
  motivoRechazo: null,
  reintegrado: 0,
  retenido: 0,
});

/** Para arrancar una prueba con el torneo en otro estado, o con su cancelación ya hecha. */
export const prepararTorneoACancelar = (
  estado: EstadoTorneo,
  conCancelacion: Partial<CancelacionDelTorneo> | null = null
) => {
  estadoTorneo = estado;
  cancelacion = conCancelacion ? { ...sinCancelar(), ...conCancelacion } : null;
};

export const resetCancelacionMock = () => prepararTorneoACancelar(torneoBase.estado);

const problema = (status: number, codigo: string, detail: string, extra: object = {}) =>
  HttpResponse.json(
    { status, codigo, detail, ...extra },
    { status, headers: { 'Content-Type': 'application/problem+json' } }
  );

export const cancelacionHandlers = [
  http.get(`${API_URL}/torneos/${TORNEO_A_CANCELAR}`, () =>
    HttpResponse.json({ ...torneoBase, estado: estadoTorneo })
  ),
  http.get(`${API_URL}/torneos/${TORNEO_A_CANCELAR}/inscripciones`, () =>
    HttpResponse.json({
      content: [],
      page: { size: 20, number: 0, totalElements: 0, totalPages: 0 },
    })
  ),

  // GET /torneos/{id}/cancelacion: el tope siempre; la cancelación, si la hay
  http.get(`${API_URL}/torneos/${TORNEO_A_CANCELAR}/cancelacion`, () =>
    HttpResponse.json(cancelacion ?? sinCancelar())
  ),

  // POST /torneos/{id}/cancelacion (multipart): sin gastos se aprueba sola; con gastos queda en revisión
  http.post(`${API_URL}/torneos/${TORNEO_A_CANCELAR}/cancelacion`, async ({ request }) => {
    if (!['INSCRIPCION_ABIERTA', 'INSCRIPCION_CERRADA', 'EN_CURSO'].includes(estadoTorneo)) {
      return problema(409, 'TORNEO_NO_CANCELABLE', 'El torneo ya no se puede cancelar', {
        estado: estadoTorneo,
      });
    }
    const datos = await request.formData();
    const gastos: { concepto: string; monto: number }[] = [];
    const errores: { campo: string; codigo: string; mensaje: string }[] = [];
    for (let i = 0; datos.has(`gastos[${i}].monto`); i++) {
      gastos.push({
        concepto: String(datos.get(`gastos[${i}].concepto`)),
        monto: Number(datos.get(`gastos[${i}].monto`)),
      });
      if (!datos.get(`gastos[${i}].comprobante`)) {
        errores.push({
          campo: `gastos[${i}].comprobante`,
          codigo: 'REQUERIDO',
          mensaje: 'Debe adjuntar un comprobante válido por cada gasto declarado',
        });
      }
    }
    if (errores.length) {
      return problema(400, 'VALIDACION', 'Hay campos inválidos', { errores });
    }
    const totalGastos = gastos.reduce((s, g) => s + g.monto, 0);
    if (totalGastos > MAXIMO) {
      return problema(
        400,
        'GASTOS_SOBRE_TOPE',
        `Los gastos a retener no pueden superar el ${PCT_MAXIMO}% del pozo. El monto excedente debe ser devuelto a los participantes`,
        { pctMaximo: PCT_MAXIMO, pozo: POZO, maximo: MAXIMO, declarado: totalGastos }
      );
    }
    const automatica = gastos.length === 0;
    const motivo = String(datos.get('motivo'));
    estadoTorneo = automatica ? 'CANCELADO' : 'CANCELACION_EN_REVISION';
    cancelacion = {
      ...sinCancelar(),
      estado: automatica ? 'AUTOMATICA' : 'EN_REVISION',
      motivo,
      pedidaEn: '2026-11-10T18:00:00Z',
      gastos,
      totalGastos,
      reintegrado: automatica ? 22000 : 0,
    };
    return HttpResponse.json(
      {
        cancelacionId: 1,
        torneoId: TORNEO_A_CANCELAR,
        estado: cancelacion.estado,
        totalGastos,
        pozo: POZO,
        reintegrado: cancelacion.reintegrado,
      },
      { status: 201 }
    );
  }),
];
