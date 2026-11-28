import { http, HttpResponse } from 'msw';
import { CalificacionDetalle, CalificacionRequest } from '../api/calificacionApi';
import { UsuarioPublico } from '../api/jugadorApi';
import { JugadorSancionable, SancionDetalle, SancionRequest } from '../api/sancionApi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

/** HU-803, HU-802 y HU-805. Quien sanciona y califica en los mocks. */
const ORGANIZADOR: UsuarioPublico = {
  id: 3,
  username: 'organizador',
  nombres: 'Olga',
  apellidos: 'Organizadora',
};

/** Los sancionables de cualquier torneo: un individual y dos de la nómina de un equipo. */
export const JUGADORES_SANCIONABLES: JugadorSancionable[] = [
  {
    inscripcionId: 1,
    equipo: null,
    jugador: { id: 2, username: 'usuario', nombres: 'Juan', apellidos: 'Pérez' },
  },
  {
    inscripcionId: 2,
    equipo: 'Los Rudos',
    jugador: { id: 20, username: 'rudo1', nombres: 'Ramón', apellidos: 'Díaz' },
  },
  {
    inscripcionId: 2,
    equipo: 'Los Rudos',
    jugador: { id: 21, username: 'rudo2', nombres: 'Rita', apellidos: 'Sosa' },
  },
];

let sanciones: SancionDetalle[] = [];
let siguienteId = 1;
let calificaciones: CalificacionDetalle[] = [];

export const resetSancionesMock = () => {
  sanciones = [];
  calificaciones = [];
  siguienteId = 1;
};

const problema = (status: number, codigo: string, detail: string, errores?: unknown[]) =>
  HttpResponse.json({ status, codigo, detail, ...(errores ? { errores } : {}) }, { status });

export const sancionHandlers = [
  // HU-802: en los mocks nadie movió su índice todavía
  http.get(`${API_URL}/usuarios/:id/fair-play`, ({ params }) =>
    HttpResponse.json({
      usuarioId: Number(params.id),
      valor: 100,
      actualizadoEn: null,
      historial: [],
    })
  ),

  // HU-804: en los mocks un usuario arranca sin insignias ni rifas ganadas
  http.get(`${API_URL}/usuarios/:id/logros`, ({ params }) =>
    HttpResponse.json({
      usuarioId: Number(params.id),
      insignias: [],
      rifasGanadas: [],
    })
  ),

  http.get(`${API_URL}/torneos/:id/sanciones/jugadores`, () =>
    HttpResponse.json(JUGADORES_SANCIONABLES)
  ),

  http.get(`${API_URL}/torneos/:id/sanciones`, ({ params }) =>
    HttpResponse.json(sanciones.filter((s) => s.torneoId === Number(params.id)))
  ),

  http.get(`${API_URL}/sanciones/mias`, () => HttpResponse.json(sanciones)),

  http.post(`${API_URL}/torneos/:id/sanciones`, async ({ params, request }) => {
    const body = (await request.json()) as SancionRequest;
    if (!body.motivo?.trim()) {
      return problema(400, 'VALIDACION', 'Hay campos inválidos', [
        { campo: 'motivo', codigo: 'REQUERIDO', mensaje: 'Falta el motivo' },
      ]);
    }
    const jugador = JUGADORES_SANCIONABLES.find((j) => j.jugador.id === body.usuarioId);
    if (!jugador) {
      return problema(409, 'JUGADOR_NO_PARTICIPA', 'El jugador no juega el torneo');
    }
    const sancion: SancionDetalle = {
      id: siguienteId++,
      torneoId: Number(params.id),
      torneo: 'Apertura F5',
      jugador: jugador.jugador,
      partidoId: body.partidoId ?? null,
      gravedad: body.gravedad,
      motivo: body.motivo.trim(),
      aplicadaPor: ORGANIZADOR,
      aplicadaEn: new Date().toISOString(),
      anuladaEn: null,
    };
    sanciones = [sancion, ...sanciones];
    return HttpResponse.json(sancion, { status: 201 });
  }),

  // HU-805: los calificables son los mismos jugadores, con la calificación que ya tengan en ese torneo
  http.get(`${API_URL}/torneos/:id/calificaciones`, ({ params }) =>
    HttpResponse.json(
      JUGADORES_SANCIONABLES.map((j) => ({
        ...j,
        calificacion:
          calificaciones.find(
            (c) => c.torneoId === Number(params.id) && c.jugador.id === j.jugador.id
          ) ?? null,
      }))
    )
  ),

  http.post(`${API_URL}/torneos/:id/calificaciones`, async ({ params, request }) => {
    const body = (await request.json()) as CalificacionRequest;
    const jugador = JUGADORES_SANCIONABLES.find((j) => j.jugador.id === body.usuarioId);
    if (!jugador) {
      return problema(409, 'JUGADOR_NO_PARTICIPA', 'El jugador no jugó el torneo');
    }
    const torneoId = Number(params.id);
    if (calificaciones.some((c) => c.torneoId === torneoId && c.jugador.id === body.usuarioId)) {
      return problema(409, 'JUGADOR_YA_CALIFICADO', 'El jugador ya está calificado en el torneo');
    }
    const calificacion: CalificacionDetalle = {
      id: siguienteId++,
      torneoId,
      torneo: 'Apertura F5',
      jugador: jugador.jugador,
      organizador: ORGANIZADOR,
      puntaje: body.puntaje,
      comentario: body.comentario?.trim() || null,
      noConfiable: body.noConfiable,
      creadaEn: new Date().toISOString(),
    };
    calificaciones = [...calificaciones, calificacion];
    return HttpResponse.json(calificacion, { status: 201 });
  }),
];
