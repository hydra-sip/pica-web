import { http, HttpResponse } from 'msw';
import {
  DecisionReclamo,
  EstadoReclamo,
  ReclamoAdminResumen,
} from '../api/reclamoAdminApi';
import { ErrorCampo, problema, validacion } from './adminHandlers';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const crearReclamosIniciales = (): ReclamoAdminResumen[] => [
  {
    id: 1,
    motivo: 'Solicito revisión de la semilla de drand y del cálculo del primer premio.',
    estado: 'PENDIENTE',
    resolucion: null,
    resueltoEn: null,
    resueltoPor: null,
    fondosLiberadosEn: null,
    fondosLiberadosPor: null,
    fondosLiberadosMonto: null,
    creadoEn: '2026-11-10T15:30:00Z',
    rifa: {
      id: 10,
      titulo: 'Gran Rifa Benéfica de la Copa',
      estado: 'EN_REVISION',
      torneoNombre: 'Copa PICA 2026 - Eliminación Directa',
      fechaSorteo: '2026-10-26T21:00:00Z',
      semillaObtenidaEn: '2026-10-26T21:00:05Z',
    },
    reclamante: {
      id: 2,
      username: 'jperez',
      email: 'juan.perez@example.com',
    },
  },
  {
    id: 2,
    motivo: 'Discrepancia detectada en la semilla publicada del sorteo',
    estado: 'PENDIENTE',
    resolucion: null,
    resueltoEn: null,
    resueltoPor: null,
    fondosLiberadosEn: null,
    fondosLiberadosPor: null,
    fondosLiberadosMonto: null,
    creadoEn: '2026-11-09T18:10:00Z',
    rifa: {
      id: 40,
      titulo: 'Rifa en Revisión por Disputa',
      estado: 'EN_REVISION',
      torneoNombre: null,
      fechaSorteo: '2026-11-08T20:00:00Z',
      semillaObtenidaEn: '2026-11-08T20:00:05Z',
    },
    reclamante: {
      id: 1,
      username: 'usuario',
      email: 'user@pica.edu.ar',
    },
  },
  {
    id: 3,
    motivo: 'El hash de compromiso no coincide con la lista sellada publicada.',
    estado: 'ACEPTADO',
    resolucion:
      'Se verificó discrepancia en el hash de la lista sellada. Se confirma fraude y se cancela la rifa con reintegro.',
    resueltoEn: '2026-11-08T11:20:00Z',
    resueltoPor: 'soporte',
    fondosLiberadosEn: '2026-11-08T11:25:00Z',
    fondosLiberadosPor: 'soporte',
    fondosLiberadosMonto: 5500,
    creadoEn: '2026-11-07T20:00:00Z',
    rifa: {
      id: 41,
      titulo: 'Rifa Aniversario Club Norte',
      estado: 'CANCELADA',
      torneoNombre: 'Torneo Aniversario',
      fechaSorteo: '2026-11-07T19:00:00Z',
      semillaObtenidaEn: '2026-11-07T19:00:05Z',
    },
    reclamante: {
      id: 3,
      username: 'mgarcia',
      email: 'maria.garcia@example.com',
    },
  },
  {
    id: 4,
    motivo: 'Creí que mi número 14 debía ganar el primer premio.',
    estado: 'RECHAZADO',
    resolucion: 'Recalculado el sorteo con la semilla oficial; los ganadores coinciden exactamente.',
    resueltoEn: '2026-11-06T16:45:00Z',
    resueltoPor: 'admin',
    fondosLiberadosEn: null,
    fondosLiberadosPor: null,
    fondosLiberadosMonto: null,
    creadoEn: '2026-11-06T14:00:00Z',
    rifa: {
      id: 42,
      titulo: 'Rifa Clausura Primavera',
      estado: 'SORTEADA',
      torneoNombre: 'Copa Primavera',
      fechaSorteo: '2026-11-05T21:00:00Z',
      semillaObtenidaEn: '2026-11-05T21:00:05Z',
    },
    reclamante: {
      id: 4,
      username: 'lfernandez',
      email: 'lucas.fernandez@example.com',
    },
  },
];

let mockReclamosAdmin: ReclamoAdminResumen[] = crearReclamosIniciales();

export const resetReclamosAdminMock = () => {
  mockReclamosAdmin = crearReclamosIniciales();
};

const ESTADOS_VALIDOS: EstadoReclamo[] = ['PENDIENTE', 'ACEPTADO', 'RECHAZADO'];
const DECISIONES_VALIDAS: DecisionReclamo[] = ['SIN_FRAUDE', 'FRAUDE_CONFIRMADO'];

export const crearReclamoAdminHandlers = (
  usuarioActual: () => { usuario: { username: string } }
) => [
  // GET /api/v1/admin/reclamos?estado=&page=0&size=20
  http.get(`${API_URL}/admin/reclamos`, ({ request }) => {
    const url = new URL(request.url);
    const estadoParam = url.searchParams.get('estado');

    if (estadoParam && !ESTADOS_VALIDOS.includes(estadoParam as EstadoReclamo)) {
      return validacion([
        { campo: 'estado', codigo: 'VALOR_INVALIDO', mensaje: 'Estado de reclamo inválido' },
      ]);
    }

    const filtrados = estadoParam
      ? mockReclamosAdmin.filter((r) => r.estado === estadoParam)
      : mockReclamosAdmin;

    // Primero los PENDIENTE, luego más recientes primero
    const ordenados = [...filtrados].sort((a, b) => {
      const pA = a.estado === 'PENDIENTE' ? 0 : 1;
      const pB = b.estado === 'PENDIENTE' ? 0 : 1;
      if (pA !== pB) return pA - pB;
      return b.creadoEn.localeCompare(a.creadoEn) || b.id - a.id;
    });

    const size = Math.min(Math.max(Number(url.searchParams.get('size') ?? 20) || 20, 1), 100);
    const number = Math.max(Number(url.searchParams.get('page') ?? 0) || 0, 0);

    return HttpResponse.json({
      content: ordenados.slice(number * size, (number + 1) * size),
      page: {
        size,
        number,
        totalElements: ordenados.length,
        totalPages: Math.ceil(ordenados.length / size),
      },
    });
  }),

  // GET /api/v1/admin/reclamos/{id}
  http.get(`${API_URL}/admin/reclamos/:id`, ({ params }) => {
    const reclamo = mockReclamosAdmin.find((r) => r.id === Number(params.id));
    if (!reclamo) {
      return problema(404, 'RECLAMO_NO_ENCONTRADO', `El reclamo ${params.id} no existe`);
    }
    return HttpResponse.json(reclamo);
  }),

  // POST /api/v1/admin/reclamos/{id}/resolucion
  http.post(`${API_URL}/admin/reclamos/:id/resolucion`, async ({ params, request }) => {
    const idx = mockReclamosAdmin.findIndex((r) => r.id === Number(params.id));
    if (idx === -1) {
      return problema(404, 'RECLAMO_NO_ENCONTRADO', `El reclamo ${params.id} no existe`);
    }

    const body = (await request.json().catch(() => ({}))) as {
      decision?: unknown;
      resolucion?: unknown;
    };

    const errores: ErrorCampo[] = [];
    if (typeof body.decision !== 'string' || !DECISIONES_VALIDAS.includes(body.decision as DecisionReclamo)) {
      errores.push({
        campo: 'decision',
        codigo: body.decision ? 'VALOR_INVALIDO' : 'REQUERIDO',
        mensaje: 'Seleccioná SIN_FRAUDE o FRAUDE_CONFIRMADO',
      });
    }
    const textoResolucion = typeof body.resolucion === 'string' ? body.resolucion.trim() : '';
    if (!textoResolucion) {
      errores.push({
        campo: 'resolucion',
        codigo: 'REQUERIDO',
        mensaje: 'La fundamentación de la resolución es obligatoria',
      });
    } else if (textoResolucion.length > 2000) {
      errores.push({
        campo: 'resolucion',
        codigo: 'LONGITUD',
        mensaje: 'Hasta 2000 caracteres',
      });
    }
    if (errores.length > 0) {
      return validacion(errores);
    }

    const actual = mockReclamosAdmin[idx];
    if (actual.estado !== 'PENDIENTE') {
      return problema(409, 'RECLAMO_YA_RESUELTO', 'Este reclamo ya fue resuelto anteriormente');
    }

    const decision = body.decision as DecisionReclamo;
    const nuevoEstado: EstadoReclamo =
      decision === 'FRAUDE_CONFIRMADO' ? 'ACEPTADO' : 'RECHAZADO';
    const ahora = new Date().toISOString();
    const resueltoPor = usuarioActual().usuario.username || 'admin';

    const otrosPendientesMismaRifa = mockReclamosAdmin.some(
      (r) => r.id !== actual.id && r.rifa.id === actual.rifa.id && r.estado === 'PENDIENTE'
    );
    const nuevoEstadoRifa = otrosPendientesMismaRifa
      ? ('EN_REVISION' as const)
      : ('SORTEADA' as const);

    mockReclamosAdmin = mockReclamosAdmin.map((r) => {
      if (r.id === actual.id) {
        return {
          ...r,
          estado: nuevoEstado,
          resolucion: textoResolucion,
          resueltoEn: ahora,
          resueltoPor,
          rifa: { ...r.rifa, estado: nuevoEstadoRifa },
        };
      }
      if (r.rifa.id === actual.rifa.id) {
        return { ...r, rifa: { ...r.rifa, estado: nuevoEstadoRifa } };
      }
      return r;
    });

    return HttpResponse.json(mockReclamosAdmin[idx]);
  }),

  http.post(`${API_URL}/admin/reclamos/:id/liberar`, async ({ params }) => {
    const id = Number(params.id);
    const actual = mockReclamosAdmin.find((r) => r.id === id);
    if (!actual) {
      return HttpResponse.json(
        { codigo: 'RECLAMO_NO_ENCONTRADO', detail: `Reclamo #${params.id} no encontrado` },
        { status: 404 }
      );
    }

    if (
      actual.fondosLiberadosEn !== null ||
      actual.rifa.estado === 'LIQUIDADA' ||
      actual.rifa.estado === 'CANCELADA'
    ) {
      return HttpResponse.json(
        {
          codigo: 'CUSTODIA_LIBERADA',
          detail: 'Los fondos de esta rifa ya fueron liberados.',
        },
        { status: 409 }
      );
    }

    if (actual.estado === 'PENDIENTE') {
      return HttpResponse.json(
        {
          codigo: 'RECLAMO_NO_RESUELTO',
          detail: 'El reclamo todavía está pendiente de resolución.',
        },
        { status: 409 }
      );
    }

    const otrosPendientesMismaRifa = mockReclamosAdmin.some(
      (r) => r.id !== actual.id && r.rifa.id === actual.rifa.id && r.estado === 'PENDIENTE'
    );
    if (actual.rifa.estado === 'EN_REVISION' || otrosPendientesMismaRifa) {
      return HttpResponse.json(
        {
          codigo: 'FONDOS_EN_CUSTODIA',
          detail: 'La rifa todavía tiene otros reclamos pendientes en revisión.',
        },
        { status: 409 }
      );
    }

    const ahora = new Date().toISOString();
    const ejecutor = usuarioActual().usuario.username || 'admin';
    const nuevoEstadoRifa =
      actual.estado === 'ACEPTADO' ? ('CANCELADA' as const) : ('LIQUIDADA' as const);
    const monto = actual.estado === 'ACEPTADO' ? 5500 : 5000;

    let actualizado: ReclamoAdminResumen | undefined;
    mockReclamosAdmin = mockReclamosAdmin.map((r) => {
      if (r.id === actual.id) {
        actualizado = {
          ...r,
          fondosLiberadosEn: ahora,
          fondosLiberadosPor: ejecutor,
          fondosLiberadosMonto: monto,
          rifa: { ...r.rifa, estado: nuevoEstadoRifa },
        };
        return actualizado;
      }
      if (r.rifa.id === actual.rifa.id) {
        return { ...r, rifa: { ...r.rifa, estado: nuevoEstadoRifa } };
      }
      return r;
    });

    return HttpResponse.json(actualizado);
  }),
];

