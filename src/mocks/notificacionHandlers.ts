import { http, HttpResponse } from 'msw';
import { Notificacion } from '../api/notificacionApi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

// Las de cada usuario por id, como en el back: cada uno ve y marca solo las suyas. Arrancan vacías.
let porUsuario = new Map<number, Notificacion[]>();
let siguienteId = 1;

export const resetNotificacionesMock = () => {
  porUsuario = new Map();
  siguienteId = 1;
};

/** Para los tests: la guarda como si la hubiera creado el back y la devuelve con su id. */
export const agregarNotificacionMock = (
  usuarioId: number,
  notificacion: Omit<Notificacion, 'id' | 'leidaEn' | 'creadaEn' | 'datos'> &
    Partial<Pick<Notificacion, 'leidaEn' | 'creadaEn' | 'datos'>>
): Notificacion => {
  const nueva: Notificacion = {
    datos: {},
    leidaEn: null,
    creadaEn: new Date().toISOString(),
    ...notificacion,
    id: siguienteId++,
  };
  porUsuario.set(usuarioId, [...(porUsuario.get(usuarioId) ?? []), nueva]);
  return nueva;
};

const delUsuario = (usuarioId: number) => porUsuario.get(usuarioId) ?? [];

/** GET /me/notificaciones, marcar una y marcar todas (HU-808), para el usuario logueado de los mocks. */
export const crearNotificacionHandlers = (usuarioActual: () => { usuario: { id: number } }) => [
  http.get(`${API_URL}/me/notificaciones`, ({ request }) => {
    const url = new URL(request.url);
    // sin leida, todas; leida=false, las que faltan leer; leida=true, las leídas
    const leida = url.searchParams.get('leida');
    const page = Number(url.searchParams.get('page') ?? 0);
    const size = Number(url.searchParams.get('size') ?? 20);
    const todas = [...delUsuario(usuarioActual().usuario.id)]
      .filter((n) => leida === null || (leida === 'true') === (n.leidaEn !== null))
      .sort((a, b) => b.creadaEn.localeCompare(a.creadaEn) || b.id - a.id);
    return HttpResponse.json({
      content: todas.slice(page * size, (page + 1) * size),
      page: { size, number: page, totalElements: todas.length, totalPages: Math.ceil(todas.length / size) },
    });
  }),

  http.post(`${API_URL}/me/notificaciones/:id/leida`, ({ params }) => {
    const notificacion = delUsuario(usuarioActual().usuario.id).find((n) => n.id === Number(params.id));
    if (!notificacion) {
      return HttpResponse.json(
        { status: 404, codigo: 'NOTIFICACION_NO_ENCONTRADA', detail: `No existe la notificación ${params.id}` },
        { status: 404, headers: { 'Content-Type': 'application/problem+json' } }
      );
    }
    notificacion.leidaEn ??= new Date().toISOString();
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API_URL}/me/notificaciones/leidas`, () => {
    const ahora = new Date().toISOString();
    delUsuario(usuarioActual().usuario.id).forEach((n) => {
      n.leidaEn ??= ahora;
    });
    return new HttpResponse(null, { status: 204 });
  }),
];
