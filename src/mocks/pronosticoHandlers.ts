import { http, HttpResponse } from 'msw';
import { Eleccion, FilaRanking, PartidoPronostico, PronosticoDetalle } from '../api/pronosticoApi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export const PARTIDOS_PRONOSTICO_MOCK: PartidoPronostico[] = [
  {
    partidoId: 101,
    torneoId: 1,
    torneoNombre: 'Copa de Campeones 2026',
    ronda: 1,
    nombreRonda: 'Cuartos de final',
    posicion: 1,
    estado: 'PROGRAMADO',
    fechaProgramada: '2026-11-05T18:00:00Z',
    cierraEn: '2026-11-05T18:00:00Z',
    abierto: true,
    local: {
      inscripcionId: 10,
      nombre: 'Los Leones FC',
      puntaje: null,
      penales: null,
      ganador: null,
    },
    visitante: {
      inscripcionId: 11,
      nombre: 'Águilas Doradas',
      puntaje: null,
      penales: null,
      ganador: null,
    },
    miPronostico: null,
  },
  {
    partidoId: 102,
    torneoId: 1,
    torneoNombre: 'Copa de Campeones 2026',
    ronda: 1,
    nombreRonda: 'Cuartos de final',
    posicion: 2,
    estado: 'PROGRAMADO',
    fechaProgramada: '2026-11-05T20:30:00Z',
    cierraEn: '2026-11-05T20:30:00Z',
    abierto: true,
    local: {
      inscripcionId: 12,
      nombre: 'Halcones del Norte',
      puntaje: null,
      penales: null,
      ganador: null,
    },
    visitante: {
      inscripcionId: 13,
      nombre: 'Gladiadores',
      puntaje: null,
      penales: null,
      ganador: null,
    },
    miPronostico: {
      eleccion: '1',
      puntos: null,
      creadoEn: '2026-10-26T15:00:00Z',
      modificadoEn: '2026-10-26T15:00:00Z',
    },
  },
  {
    partidoId: 103,
    torneoId: 1,
    torneoNombre: 'Copa de Campeones 2026',
    ronda: 1,
    nombreRonda: 'Octavos de final',
    posicion: 3,
    estado: 'CONFIRMADO',
    fechaProgramada: '2026-10-20T17:00:00Z',
    cierraEn: '2026-10-20T17:00:00Z',
    abierto: false,
    local: {
      inscripcionId: 14,
      nombre: 'Relámpago FC',
      puntaje: 2,
      penales: null,
      ganador: false,
    },
    visitante: {
      inscripcionId: 15,
      nombre: 'Titanes del Sur',
      puntaje: 3,
      penales: null,
      ganador: true,
    },
    miPronostico: {
      eleccion: '2',
      puntos: 3, // Acertó victoria visitante
      creadoEn: '2026-10-19T10:00:00Z',
      modificadoEn: '2026-10-19T10:00:00Z',
    },
  },
  {
    partidoId: 104,
    torneoId: 1,
    torneoNombre: 'Copa de Campeones 2026',
    ronda: 1,
    nombreRonda: 'Octavos de final',
    posicion: 4,
    estado: 'CONFIRMADO',
    fechaProgramada: '2026-10-20T19:30:00Z',
    cierraEn: '2026-10-20T19:30:00Z',
    abierto: false,
    local: {
      inscripcionId: 16,
      nombre: 'Deportivo Central',
      puntaje: 1,
      penales: null,
      ganador: true,
    },
    visitante: {
      inscripcionId: 17,
      nombre: 'Huracán Verde',
      puntaje: 0,
      penales: null,
      ganador: false,
    },
    miPronostico: {
      eleccion: 'X', // Eligió empate pero ganó local
      puntos: 0,
      creadoEn: '2026-10-19T12:00:00Z',
      modificadoEn: '2026-10-19T12:00:00Z',
    },
  },
  {
    partidoId: 201,
    torneoId: 2,
    torneoNombre: 'Torneo Apertura Fútbol 7',
    ronda: 2,
    nombreRonda: 'Semifinal',
    posicion: 1,
    estado: 'PROGRAMADO',
    fechaProgramada: '2026-11-10T19:00:00Z',
    cierraEn: '2026-11-10T19:00:00Z',
    abierto: true,
    local: {
      inscripcionId: 18,
      nombre: 'La Banda FC',
      puntaje: null,
      penales: null,
      ganador: null,
    },
    visitante: {
      inscripcionId: 19,
      nombre: 'Los Guerreros',
      puntaje: null,
      penales: null,
      ganador: null,
    },
    miPronostico: null,
  },
  {
    partidoId: 202,
    torneoId: 2,
    torneoNombre: 'Torneo Apertura Fútbol 7',
    ronda: 1,
    nombreRonda: 'Cuartos de final',
    posicion: 2,
    estado: 'EN_JUEGO',
    fechaProgramada: '2026-10-25T16:00:00Z',
    cierraEn: '2026-10-25T16:00:00Z',
    abierto: false,
    local: {
      inscripcionId: 20,
      nombre: 'Estrella Roja',
      puntaje: 1,
      penales: null,
      ganador: null,
    },
    visitante: {
      inscripcionId: 21,
      nombre: 'Deportivo Unión',
      puntaje: 1,
      penales: null,
      ganador: null,
    },
    miPronostico: null, // Ventana cerrada y no pronosticó
  },
];

export const RANKING_PRONOSTICOS_MOCK: FilaRanking[] = [
  {
    posicion: 1,
    usuarioId: 10,
    username: 'martin_palermo',
    nombre: 'Martín Palermo',
    puntos: 27,
    aciertos: 9,
    pronosticosTotales: 10,
    primerPronosticoEn: '2026-10-20T15:00:00Z',
  },
  {
    posicion: 2,
    usuarioId: 2,
    username: 'usuario',
    nombre: 'Usuario PICA',
    puntos: 21,
    aciertos: 7,
    pronosticosTotales: 9,
    primerPronosticoEn: '2026-10-20T15:00:00Z',
  },
  {
    posicion: 3,
    usuarioId: 12,
    username: 'lucas_g',
    nombre: 'Lucas Gómez',
    puntos: 18,
    aciertos: 6,
    pronosticosTotales: 10,
    primerPronosticoEn: '2026-10-20T15:00:00Z',
  },
  {
    posicion: 4,
    usuarioId: 15,
    username: 'franco_c',
    nombre: 'Franco Colapinto',
    puntos: 15,
    aciertos: 5,
    pronosticosTotales: 8,
    primerPronosticoEn: '2026-10-20T15:00:00Z',
  },
  {
    posicion: 5,
    usuarioId: 20,
    username: 'camila_s',
    nombre: 'Camila Suárez',
    puntos: 9,
    aciertos: 3,
    pronosticosTotales: 7,
    primerPronosticoEn: '2026-10-20T15:00:00Z',
  },
];

let partidosState: PartidoPronostico[] = JSON.parse(JSON.stringify(PARTIDOS_PRONOSTICO_MOCK));
let rankingState: FilaRanking[] = JSON.parse(JSON.stringify(RANKING_PRONOSTICOS_MOCK));

export const resetPronosticosMock = () => {
  partidosState = JSON.parse(JSON.stringify(PARTIDOS_PRONOSTICO_MOCK));
  rankingState = JSON.parse(JSON.stringify(RANKING_PRONOSTICOS_MOCK));
};

export const pronosticoHandlers = [
  // GET /pronosticos/partidos
  http.get(`${API_URL}/pronosticos/partidos`, ({ request }) => {
    const url = new URL(request.url);
    const torneoIdParam = url.searchParams.get('torneoId');
    const abiertoParam = url.searchParams.get('abierto');

    let filtrados = [...partidosState];

    if (torneoIdParam) {
      const torneoId = Number(torneoIdParam);
      filtrados = filtrados.filter((p) => p.torneoId === torneoId);
    }

    if (abiertoParam !== null) {
      const abierto = abiertoParam === 'true';
      filtrados = filtrados.filter((p) => p.abierto === abierto);
    }

    return HttpResponse.json(filtrados);
  }),

  // PUT /partidos/:id/pronostico
  http.put(`${API_URL}/partidos/:id/pronostico`, async ({ params, request }) => {
    const partidoId = Number(params.id);
    const body = (await request.json().catch(() => ({}))) as { eleccion?: string };

    const partido = partidosState.find((p) => p.partidoId === partidoId);
    if (!partido) {
      return new HttpResponse(
        JSON.stringify({
          status: 404,
          codigo: 'PARTIDO_NO_ENCONTRADO',
          detail: 'El partido no existe.',
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const eleccionValida = body.eleccion === '1' || body.eleccion === 'X' || body.eleccion === '2';
    if (!eleccionValida) {
      return new HttpResponse(
        JSON.stringify({
          status: 400,
          codigo: 'PRONOSTICO_INVALIDO',
          detail: 'El pronóstico indicado no es válido. Debe ser 1, X o 2.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Comprobar ventana de pronóstico
    if (!partido.abierto) {
      return new HttpResponse(
        JSON.stringify({
          status: 409,
          codigo: 'PRONOSTICO_FUERA_DE_VENTANA',
          detail: 'La ventana para cargar o modificar el pronóstico ya cerró.',
          cierraEn: partido.cierraEn,
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const eleccion = body.eleccion as Eleccion;
    const ahora = new Date().toISOString();

    const miPronostico = {
      eleccion,
      puntos: null,
      creadoEn: partido.miPronostico?.creadoEn || ahora,
      modificadoEn: ahora,
    };

    partido.miPronostico = miPronostico;

    const detalle: PronosticoDetalle = {
      partidoId,
      usuarioId: 1,
      eleccion,
      puntos: null,
      creadoEn: miPronostico.creadoEn,
      modificadoEn: miPronostico.modificadoEn,
    };

    return HttpResponse.json(detalle);
  }),

  // GET /pronosticos/ranking
  http.get(`${API_URL}/pronosticos/ranking`, ({ request }) => {
    const url = new URL(request.url);
    const torneoIdParam = url.searchParams.get('torneoId');

    // Si se especifica torneo, podríamos filtrar o devolver ranking específico
    let ranking = [...rankingState];
    if (torneoIdParam === '2') {
      ranking = ranking.map((r, i) => ({
        ...r,
        puntos: Math.max(0, r.puntos - 10),
        aciertos: Math.max(0, r.aciertos - 3),
        posicion: i + 1,
      }));
    }

    return HttpResponse.json({
      torneoId: torneoIdParam ? Number(torneoIdParam) : null,
      posiciones: ranking,
      miPosicion: null,
    });
  }),
];
