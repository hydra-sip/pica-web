import { http, HttpResponse } from 'msw';
import {
  AlertaFraudeDetalle,
  EstadoAlertaFraude,
  ReglaFraude,
} from '../api/alertaFraudeApi';
import { problema, validacion } from './adminHandlers';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const crearAlertasIniciales = (): AlertaFraudeDetalle[] => [
  {
    id: 1,
    regla: 'COMPRA_MASIVA_RIFA',
    estado: 'PENDIENTE',
    motivo:
      'Compra masiva en la rifa "Gran Rifa Benéfica de la Copa": 14 números comprados en los últimos 30 min (umbral: más de 10)',
    datos: {
      numerosComprados: 14,
      umbralNumeros: 10,
      ventanaMinutos: 30,
      rifaId: 10,
      torneoId: 3,
    },
    torneo: {
      id: 3,
      nombre: 'Liga Abierta de Ajedrez Rápido',
      slug: 'liga-ajedrez-primavera',
    },
    rifa: {
      id: 10,
      titulo: 'Gran Rifa Benéfica de la Copa',
    },
    usuario: {
      id: 2,
      username: 'jperez',
      email: 'juan.perez@example.com',
    },
    nota: null,
    revisadaPor: null,
    revisadaEn: null,
    creadaEn: '2026-11-12T15:30:00Z',
  },
  {
    id: 2,
    regla: 'CARRUSEL_CARGA_RETIRO',
    estado: 'PENDIENTE',
    motivo:
      'Carrusel carga/retiro en billetera: 3 cargas y 2 retiros en los últimos 60 min (umbral: 4 operaciones)',
    datos: {
      cargas: 3,
      retiros: 2,
      totalOperaciones: 5,
      montoCargas: 35000,
      montoRetiros: 34000,
      umbralOperaciones: 4,
      ventanaMinutos: 60,
    },
    torneo: null,
    rifa: null,
    usuario: {
      id: 4,
      username: 'lfernandez',
      email: 'lucas.fernandez@example.com',
    },
    nota: null,
    revisadaPor: null,
    revisadaEn: null,
    creadaEn: '2026-11-11T19:00:00Z',
  },
  {
    id: 3,
    regla: 'OBJECIONES_ABUSIVAS',
    estado: 'PENDIENTE',
    motivo: 'Objeciones abusivas: el usuario acumula 4 objeciones de partidos (umbral: 3)',
    datos: {
      totalObjeciones: 4,
      objecionesEnTorneo: 2,
      umbralObjeciones: 3,
      partidoId: 15,
    },
    torneo: {
      id: 1,
      nombre: 'Copa abierta',
      slug: 'dev-copa-abierta',
    },
    rifa: null,
    usuario: {
      id: 2,
      username: 'jperez',
      email: 'juan.perez@example.com',
    },
    nota: null,
    revisadaPor: null,
    revisadaEn: null,
    creadaEn: '2026-11-10T11:20:00Z',
  },
  {
    id: 4,
    regla: 'CANCELACIONES_REITERADAS',
    estado: 'REVISADA',
    motivo: 'Cancelaciones reiteradas: el organizador acumula 2 torneos cancelados (umbral: 2)',
    datos: {
      torneosCancelados: 2,
      umbralCancelaciones: 2,
      torneoIds: [3, 2],
    },
    torneo: {
      id: 3,
      nombre: 'Liga Abierta de Ajedrez Rápido',
      slug: 'liga-ajedrez-primavera',
    },
    rifa: null,
    usuario: {
      id: 4,
      username: 'lfernandez',
      email: 'lucas.fernandez@example.com',
    },
    nota: 'Se verificó que corresponden a compras grupales autorizadas.',
    revisadaPor: 'admin',
    revisadaEn: '2026-11-09T14:00:00Z',
    creadaEn: '2026-11-08T10:00:00Z',
  },
];

let alertas: AlertaFraudeDetalle[] = crearAlertasIniciales();

export const resetAlertasFraudeMock = () => {
  alertas = crearAlertasIniciales();
};

const ESTADOS_VALIDOS: EstadoAlertaFraude[] = ['PENDIENTE', 'REVISADA'];
const REGLAS_VALIDAS: ReglaFraude[] = [
  'COMPRA_MASIVA_RIFA',
  'CARRUSEL_CARGA_RETIRO',
  'CANCELACIONES_REITERADAS',
  'OBJECIONES_ABUSIVAS',
  'CUENTAS_COMPARTIDAS',
];

const ordenarAlertas = (lista: AlertaFraudeDetalle[]): AlertaFraudeDetalle[] =>
  [...lista].sort((a, b) => {
    if (a.estado !== b.estado) {
      return a.estado === 'PENDIENTE' ? -1 : 1;
    }
    const cmpFecha = b.creadaEn.localeCompare(a.creadaEn);
    return cmpFecha !== 0 ? cmpFecha : b.id - a.id;
  });

export const crearAlertaFraudeHandlers = (
  getUsuario: () => { usuario: { id: number; username: string }; permisos: string[] }
) => [
  http.get(`${API_URL}/admin/alertas-fraude`, ({ request }) => {
    if (!getUsuario().permisos.includes('ALERTA_FRAUDE_REVISAR')) {
      return problema(403, 'SIN_PERMISO', 'No tenés permiso para consultar alertas de fraude.');
    }

    const url = new URL(request.url);
    const estado = url.searchParams.get('estado') as EstadoAlertaFraude | null;
    const regla = url.searchParams.get('regla') as ReglaFraude | null;
    const usuarioId = url.searchParams.get('usuarioId');
    const torneoId = url.searchParams.get('torneoId');
    const rifaId = url.searchParams.get('rifaId');
    const desde = url.searchParams.get('desde');
    const hasta = url.searchParams.get('hasta');
    const page = Math.max(Number(url.searchParams.get('page') ?? 0) || 0, 0);
    const size = Math.min(Math.max(Number(url.searchParams.get('size') ?? 20) || 20, 1), 100);

    const filtradas = ordenarAlertas(
      alertas.filter((a) => {
        if (estado && ESTADOS_VALIDOS.includes(estado) && a.estado !== estado) return false;
        if (regla && REGLAS_VALIDAS.includes(regla) && a.regla !== regla) return false;
        if (usuarioId && a.usuario.id !== Number(usuarioId)) return false;
        if (torneoId && a.torneo?.id !== Number(torneoId)) return false;
        if (rifaId && a.rifa?.id !== Number(rifaId)) return false;
        if (desde && new Date(a.creadaEn) < new Date(desde)) return false;
        if (hasta && new Date(a.creadaEn) >= new Date(hasta)) return false;
        return true;
      })
    );

    const content = filtradas.slice(page * size, (page + 1) * size);
    return HttpResponse.json({
      content,
      page: {
        size,
        number: page,
        totalElements: filtradas.length,
        totalPages: Math.max(1, Math.ceil(filtradas.length / size)),
      },
    });
  }),

  http.get(`${API_URL}/admin/alertas-fraude/:id`, ({ params }) => {
    if (!getUsuario().permisos.includes('ALERTA_FRAUDE_REVISAR')) {
      return problema(403, 'SIN_PERMISO', 'No tenés permiso para consultar alertas de fraude.');
    }
    const alerta = alertas.find((a) => a.id === Number(params.id));
    if (!alerta) {
      return problema(404, 'ALERTA_FRAUDE_NO_ENCONTRADA', 'No existe la alerta de fraude.');
    }
    return HttpResponse.json(alerta);
  }),

  http.post(`${API_URL}/admin/alertas-fraude/:id/revisar`, async ({ params, request }) => {
    const actual = getUsuario();
    if (!actual.permisos.includes('ALERTA_FRAUDE_REVISAR')) {
      return problema(403, 'SIN_PERMISO', 'No tenés permiso para revisar alertas de fraude.');
    }
    const idx = alertas.findIndex((a) => a.id === Number(params.id));
    if (idx === -1) {
      return problema(404, 'ALERTA_FRAUDE_NO_ENCONTRADA', 'No existe la alerta de fraude.');
    }

    const body = (await request.json().catch(() => ({}))) as { nota?: unknown };
    const notaLimpia = typeof body.nota === 'string' ? body.nota.trim() : '';
    if (!notaLimpia) {
      return validacion([{ campo: 'nota', codigo: 'REQUERIDO', mensaje: 'Es obligatoria' }]);
    }
    if (alertas[idx].estado === 'REVISADA') {
      return problema(409, 'ALERTA_FRAUDE_YA_REVISADA', 'La alerta ya fue revisada.');
    }

    const actualizada: AlertaFraudeDetalle = {
      ...alertas[idx],
      estado: 'REVISADA',
      nota: notaLimpia,
      revisadaPor: actual.usuario.username,
      revisadaEn: new Date().toISOString(),
    };
    alertas[idx] = actualizada;
    return HttpResponse.json(actualizada);
  }),
];
