import { http, HttpResponse } from 'msw';
import type { AccionAuditoria, EntidadAuditoria, RegistroAuditoria } from '../api/auditoriaApi';

// El libro de auditoría (HU-704) con registros fijos: solo se lee. Cada uno lleva el torneo al que pertenece para
// que la entidad TORNEO traiga lo suyo como el back, que lo resuelve con sus partidos, su rifa y sus custodias.
// Los usuarios y torneos son los de adminHandlers y torneoHandlers: 3 es la Liga Abierta de Ajedrez Rápido.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

type RegistroMock = RegistroAuditoria & { torneoId: number | null };

// Lo que el back busca al leer: el nombre de cada entidad
const DESCRIPCIONES: Record<string, string> = {
  'USUARIO:1': '@admin',
  'USUARIO:4': '@lfernandez',
  'PARAMETRO:GASTOS_ADMINISTRATIVOS':
    '% de gastos administrativos que paga aparte quien se inscribe en un torneo o compra un número de rifa',
  'TORNEO:3': 'Liga Abierta de Ajedrez Rápido',
  'PARTIDO:15': 'Ronda 1 – Liga Abierta de Ajedrez Rápido',
  'CUSTODIA:7': 'Torneo: Liga Abierta de Ajedrez Rápido',
  'BILLETERA:2': '@jperez',
};

const registro = (
  id: number,
  fecha: string,
  usuario: [number, string] | null,
  accion: AccionAuditoria,
  entidad: EntidadAuditoria,
  entidadId: string | null,
  torneoId: number | null,
  detalle: Record<string, unknown>,
  ip: string | null = null
): RegistroMock => ({
  id,
  fecha,
  usuarioId: usuario?.[0] ?? null,
  username: usuario?.[1] ?? null,
  accion,
  entidad,
  entidadId,
  descripcion: (entidadId && DESCRIPCIONES[`${entidad}:${entidadId}`]) || null,
  ip,
  detalle,
  torneoId,
});

const ADMIN: [number, string] = [1, 'admin'];
const JPEREZ: [number, string] = [2, 'jperez'];
const LFERNANDEZ: [number, string] = [4, 'lfernandez'];

const registros: RegistroMock[] = [
  registro(1, '2026-11-01T13:00:00Z', ADMIN, 'LOGIN', 'USUARIO', '1', null, { identificador: 'admin' }, '190.24.55.12'),
  registro(2, '2026-11-02T14:30:00Z', ADMIN, 'MODIFICACION', 'PARAMETRO', 'GASTOS_ADMINISTRATIVOS', null, {
    anterior: 10,
    nuevo: 12,
  }),
  registro(3, '2026-11-03T15:00:00Z', JPEREZ, 'PAGO', 'CUSTODIA', '7', 3, {
    tipo: 'INSCRIPCION',
    monto: 1100,
    inscripcionId: 21,
  }),
  registro(4, '2026-11-04T18:00:00Z', null, 'CIERRE_INSCRIPCION', 'TORNEO', '3', 3, { motivo: 'FECHA' }),
  registro(5, '2026-11-05T19:01:12Z', LFERNANDEZ, 'LAUDO', 'PARTIDO', '15', 3, {
    resultado: '3-1',
    observacion: 'El visitante no se presentó al segundo tiempo y el árbitro dio por terminado el partido.',
  }),
  registro(6, '2026-11-05T19:05:00Z', LFERNANDEZ, 'LOGIN_FALLIDO', 'USUARIO', '4', null, { identificador: 'lfernandez' }, '190.24.55.12'),
  registro(7, '2026-11-06T10:00:00Z', null, 'LIQUIDACION', 'TORNEO', '3', 3, { tipo: 'PREMIO', monto: 9000, puesto: 1 }),
  registro(8, '2026-11-07T11:00:00Z', JPEREZ, 'PAGO', 'BILLETERA', '2', null, { tipo: 'CARGA', monto: 5000 }),
  // un login con un usuario que no existe: no hay a quién asociarlo, queda lo que se escribió
  registro(9, '2026-11-08T09:00:00Z', null, 'LOGIN_FALLIDO', 'USUARIO', null, null, { identificador: 'jperes' }, '181.10.20.30'),
];

const numero = (valor: string | null) => (valor ? Number(valor) : null);

/** Sin id, todas las de ese tipo; un torneo trae además lo suyo; el resto, la coincidencia exacta. */
const deLaEntidad = (r: RegistroMock, entidad: string | null, entidadId: string | null) => {
  if (!entidad) return true;
  if (!entidadId) return r.entidad === entidad;
  if (entidad === 'TORNEO') return r.torneoId === Number(entidadId);
  return r.entidad === entidad && r.entidadId === entidadId;
};

export const auditoriaHandlers = [
  // GET /admin/auditoria/ids: los ids de la entidad con registros, primero el del último más reciente
  http.get(`${API_URL}/admin/auditoria/ids`, ({ request }) => {
    const entidad = new URL(request.url).searchParams.get('entidad');
    const ids = registros
      .filter((r) => r.entidad === entidad && r.entidadId !== null)
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
      .map((r) => r.entidadId as string);
    return HttpResponse.json([...new Set(ids)]);
  }),

  // GET /admin/auditoria: los filtros se combinan; del más nuevo al más viejo
  http.get(`${API_URL}/admin/auditoria`, ({ request }) => {
    const url = new URL(request.url);
    const entidad = url.searchParams.get('entidad');
    const entidadId = url.searchParams.get('entidadId');
    const usuario = numero(url.searchParams.get('usuario'));
    const accion = url.searchParams.get('accion');
    const desde = url.searchParams.get('desde');
    const hasta = url.searchParams.get('hasta');
    const page = Number(url.searchParams.get('page') ?? 0);
    const size = Number(url.searchParams.get('size') ?? 20);

    const filtrados = registros
      .filter(
        (r) =>
          deLaEntidad(r, entidad, entidadId) &&
          (usuario === null || r.usuarioId === usuario) &&
          (!accion || r.accion === accion) &&
          (!desde || new Date(r.fecha) >= new Date(desde)) &&
          (!hasta || new Date(r.fecha) < new Date(hasta))
      )
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
      .map(({ torneoId: _torneoId, ...fila }) => fila);

    return HttpResponse.json({
      content: filtrados.slice(page * size, (page + 1) * size),
      page: {
        size,
        number: page,
        totalElements: filtrados.length,
        totalPages: Math.max(1, Math.ceil(filtrados.length / size)),
      },
    });
  }),
];
