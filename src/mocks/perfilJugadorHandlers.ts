import { http, HttpResponse } from 'msw';
import { PerfilJugador } from '../api/jugadorApi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

/** HU-801: el participante de los mocks, con torneos terminados, una rifa ganada y una insignia. */
export const JUGADOR_COMPLETO: PerfilJugador = {
  id: 2,
  username: 'usuario',
  nombreCompleto: 'Juan Pérez',
  avatar: null,
  historial: { torneosJugados: 4, victorias: 9, derrotas: 3, podios: 2 },
  fairPlay: { valor: 72, actualizadoEn: '2026-11-15T18:00:00Z' },
  ultimosTorneos: [
    {
      torneoId: 7,
      slug: 'apertura-f5',
      nombre: 'Apertura F5',
      disciplina: 'Fútbol 5',
      fechaFin: '2026-11-20T21:00:00Z',
      posicion: 1,
      equipo: 'Los Rudos',
    },
    {
      torneoId: 8,
      slug: 'copa-padel',
      nombre: 'Copa Pádel',
      disciplina: 'Pádel',
      fechaFin: '2026-10-30T21:00:00Z',
      posicion: null,
      equipo: null,
    },
  ],
  rifasGanadas: [
    {
      rifaId: 5,
      rifaTitulo: 'Rifa solidaria',
      torneoId: 7,
      torneoNombre: 'Apertura F5',
      torneoSlug: 'apertura-f5',
      puesto: 1,
      numeroGanador: 42,
      fecha: '2026-11-21T20:00:00Z',
    },
  ],
  insignias: [
    {
      codigo: 'PRIMER_TORNEO',
      nombre: 'Primer torneo',
      descripcion: 'Terminó su primer torneo.',
      icono: 'trofeo-inicio',
      otorgadaEn: '2026-10-30T21:00:00Z',
    },
  ],
};

/** HU-801: recién registrado, sin torneos terminados ni logros. */
export const JUGADOR_NUEVO: PerfilJugador = {
  id: 30,
  username: 'nuevo',
  nombreCompleto: 'Nadia Nueva',
  avatar: null,
  historial: { torneosJugados: 0, victorias: 0, derrotas: 0, podios: 0 },
  fairPlay: { valor: 100, actualizadoEn: null },
  ultimosTorneos: [],
  rifasGanadas: [],
  insignias: [],
};

const PERFILES: Record<string, PerfilJugador> = {
  [JUGADOR_COMPLETO.id]: JUGADOR_COMPLETO,
  [JUGADOR_NUEVO.id]: JUGADOR_NUEVO,
};

export const perfilJugadorHandlers = [
  // GET /usuarios/{id}/perfil (PICA-419): público; cualquier otro id, como el 999, no existe
  http.get(`${API_URL}/usuarios/:id/perfil`, ({ params }) => {
    const perfil = PERFILES[params.id as string];
    return perfil
      ? HttpResponse.json(perfil)
      : HttpResponse.json(
          { status: 404, codigo: 'USUARIO_NO_ENCONTRADO', detail: 'El usuario no existe' },
          { status: 404, headers: { 'Content-Type': 'application/problem+json' } }
        );
  }),
];
