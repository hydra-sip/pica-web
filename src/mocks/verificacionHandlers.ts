import { http, HttpResponse } from 'msw';
import { BracketTorneo, LadoBracket } from '../api/torneoApi';
import { RifaVerificacionData, TorneoVerificacionData } from '../api/verificacionApi';

// Torneo 5 del catálogo simulado (finalizado): 8 equipos, sin BYE
const sorteoTorneo5: TorneoVerificacionData = {
  id: 5,
  listaHash: 'b5d4045c3f466fa91fe2cc6abe79232a1a57cdf104f7a26e716e0a1e2789df78',
  semilla: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  inscriptos: [
    { id: 101, nombre: 'Los Halcones' },
    { id: 102, nombre: 'Deportivo PICA' },
    { id: 103, nombre: 'Atlético Juvenil' },
    { id: 104, nombre: 'Estudiantes FC' },
    { id: 105, nombre: 'San Lorenzo UNLu' },
    { id: 106, nombre: 'Unión Porteña' },
    { id: 107, nombre: 'Racing Club Norte' },
    { id: 108, nombre: 'Defensores del Sur' },
  ],
  resultadoOficial: {
    rondas: 3,
    cruces: [
      {
        posicion: 1,
        localId: 103,
        localNombre: 'Atlético Juvenil',
        visitanteId: 107,
        visitanteNombre: 'Racing Club Norte',
        bye: false,
      },
      {
        posicion: 2,
        localId: 108,
        localNombre: 'Defensores del Sur',
        visitanteId: 101,
        visitanteNombre: 'Los Halcones',
        bye: false,
      },
      {
        posicion: 3,
        localId: 102,
        localNombre: 'Deportivo PICA',
        visitanteId: 105,
        visitanteNombre: 'San Lorenzo UNLu',
        bye: false,
      },
      {
        posicion: 4,
        localId: 106,
        localNombre: 'Unión Porteña',
        visitanteId: 104,
        visitanteNombre: 'Estudiantes FC',
        bye: false,
      },
    ],
  },
};

// Torneo 3 del catálogo simulado (en curso): 11 participantes, 5 BYE
const sorteoTorneo3: TorneoVerificacionData = {
  id: 3,
  listaHash: '8f7e6d5c4b3a291807f6e5d4c3b2a1098f7e6d5c4b3a291807f6e5d4c3b2a109',
  semilla: '4f8d9b1a2c3e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcd',
  inscriptos: [
    { id: 201, nombre: 'Ajedrez UNLu' },
    { id: 202, nombre: 'Club Jaque Mate' },
    { id: 203, nombre: 'Torre Fuerte' },
    { id: 204, nombre: 'Peón Avanzado' },
    { id: 205, nombre: 'Rey Sol' },
    { id: 206, nombre: 'Caballo de Troya' },
    { id: 207, nombre: 'Alfil Negro' },
    { id: 208, nombre: 'Dama Blanca' },
    { id: 209, nombre: 'Gambito de Dama' },
    { id: 210, nombre: 'Defensa Siciliana' },
    { id: 211, nombre: 'Enroque Corto' },
  ],
  resultadoOficial: {
    rondas: 4,
    cruces: [
      {
        posicion: 1,
        localId: 206,
        localNombre: 'Caballo de Troya',
        visitanteId: null,
        visitanteNombre: null,
        bye: true,
      },
      {
        posicion: 2,
        localId: 201,
        localNombre: 'Ajedrez UNLu',
        visitanteId: null,
        visitanteNombre: null,
        bye: true,
      },
      {
        posicion: 3,
        localId: 208,
        localNombre: 'Dama Blanca',
        visitanteId: null,
        visitanteNombre: null,
        bye: true,
      },
      {
        posicion: 4,
        localId: 205,
        localNombre: 'Rey Sol',
        visitanteId: 204,
        visitanteNombre: 'Peón Avanzado',
        bye: false,
      },
      {
        posicion: 5,
        localId: 207,
        localNombre: 'Alfil Negro',
        visitanteId: null,
        visitanteNombre: null,
        bye: true,
      },
      {
        posicion: 6,
        localId: 210,
        localNombre: 'Defensa Siciliana',
        visitanteId: 209,
        visitanteNombre: 'Gambito de Dama',
        bye: false,
      },
      {
        posicion: 7,
        localId: 202,
        localNombre: 'Club Jaque Mate',
        visitanteId: null,
        visitanteNombre: null,
        bye: true,
      },
      {
        posicion: 8,
        localId: 211,
        localNombre: 'Enroque Corto',
        visitanteId: 203,
        visitanteNombre: 'Torre Fuerte',
        bye: false,
      },
    ],
  },
};

// La rifa todavía no tiene GET /rifas/{id}/sorteo (PICA-263): solo la usa el test de VerificacionRifa
export const mockRifaVerificacion10: RifaVerificacionData = {
  id: 10,
  titulo: 'Gran Rifa Benéfica de la Copa',
  torneoNombre: 'Copa PICA 2026 - Eliminación Directa',
  fechaSorteo: '2026-10-26T21:00:00Z',
  compromisoHash: 'c8b421037d30fe6404a753a3ca6fc9f8b2661ce18f66a1240004c7d429985b8f',
  listaHash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
  semilla: 'loteria-nacional-jugada-48921-sorteo-matutino-2026',
  semillaFirma:
    '304402206d2c47a329d93568d27f12e5d0bb412e803154868b1a8d05ee0c96c561b36531022026a27e029cbb0702d3ef1ecf7e1b525d8869c8a9bc697ffef8171092fb2b8a71',
  numerosVendidos: [7, 14, 21, 35, 42, 59, 73, 88, 92, 105],
  premios: [
    {
      puesto: 1,
      descripcion: 'Camiseta Oficial Autografiada',
      pct: 60,
      numeroGanador: 14,
    },
    {
      puesto: 2,
      descripcion: 'Kit Deportivo Profesional',
      pct: 30,
      numeroGanador: 59,
    },
    {
      puesto: 3,
      descripcion: 'Entradas VIP para la Final',
      pct: 10,
      numeroGanador: 35,
    },
  ],
  resultadoOficial: {
    ganadores: [
      {
        puesto: 1,
        descripcion: 'Camiseta Oficial Autografiada',
        pct: 60,
        numeroGanador: 14,
      },
      {
        puesto: 2,
        descripcion: 'Kit Deportivo Profesional',
        pct: 30,
        numeroGanador: 59,
      },
      {
        puesto: 3,
        descripcion: 'Entradas VIP para la Final',
        pct: 10,
        numeroGanador: 35,
      },
    ],
  },
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const lado = (inscripcionId: number, nombre: string): LadoBracket => ({
  inscripcionId,
  nombre,
  puntaje: null,
  penales: null,
  ganador: null,
});

/** El bracket recién sorteado, como lo devuelve GET /torneos/{id}/bracket. */
const bracketDe = (sorteo: TorneoVerificacionData): BracketTorneo => {
  const { rondas, cruces } = sorteo.resultadoOficial;
  return {
    torneoId: sorteo.id,
    semilla: sorteo.semilla,
    listaHash: sorteo.listaHash,
    rondas: Array.from({ length: rondas }, (_, i) => ({
      numero: i + 1,
      nombre: `Ronda ${i + 1}`,
      partidos: Array.from({ length: cruces.length >> i }, (_, j) => {
        const cruce = i === 0 ? cruces[j] : null;
        return {
          id: sorteo.id * 1000 + (i + 1) * 100 + j + 1,
          ronda: i + 1,
          posicion: j + 1,
          estado: 'PROGRAMADO' as const,
          bye: cruce?.bye ?? false,
          local: cruce ? lado(cruce.localId, cruce.localNombre) : null,
          visitante:
            cruce && cruce.visitanteId !== null
              ? lado(cruce.visitanteId, cruce.visitanteNombre ?? '')
              : null,
          cancha: null,
          fechaProgramada: null,
          arbitro: null,
        };
      }),
    })),
  };
};

const sorteos: Record<number, TorneoVerificacionData> = { 3: sorteoTorneo3, 5: sorteoTorneo5 };

export const verificacionHandlers = [
  // GET /torneos/{id}/bracket (público); los demás torneos del catálogo simulado no tienen bracket
  http.get(`${API_URL}/torneos/:id/bracket`, ({ params }) => {
    const sorteo = sorteos[Number(params.id)];
    if (!sorteo) {
      return HttpResponse.json({ torneoId: Number(params.id), semilla: null, listaHash: null, rondas: [] });
    }
    return HttpResponse.json(bracketDe(sorteo));
  }),
];
