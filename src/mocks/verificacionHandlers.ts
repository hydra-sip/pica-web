import { http, HttpResponse } from 'msw';
import {
  RifaVerificacionData,
  SorteoItemResumen,
  TorneoVerificacionData,
} from '../api/verificacionApi';

export const mockTorneoVerificacion1: TorneoVerificacionData = {
  id: 1,
  slug: 'dev-copa-abierta',
  nombre: 'Copa PICA 2026 - Eliminación Directa',
  disciplina: 'Fútbol 5',
  fechaSorteo: '2026-10-24T18:00:00Z',
  compromisoHash: '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
  listaHash: 'b5d4045c3f466fa91fe2cc6abe79232a1a57cdf104f7a26e716e0a1e2789df78',
  semilla: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  semillaFirma:
    '3045022100e4b85c276bc5a363b82a04870198031e5066922fc57c6bbfd11894a8df419616022067ad3a8d11c05d7620a2323a2688f63568cbb0c5dd7fb21a6ab3e1b7d5985b46',
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

export const mockTorneoVerificacion2: TorneoVerificacionData = {
  id: 2,
  slug: 'dev-torneo-cerrado',
  nombre: 'Torneo Cerrado de Ajedrez UNLu',
  disciplina: 'Ajedrez',
  fechaSorteo: '2026-10-25T14:30:00Z',
  compromisoHash: '1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f809',
  listaHash: '8f7e6d5c4b3a291807f6e5d4c3b2a1098f7e6d5c4b3a291807f6e5d4c3b2a109',
  semilla: '4f8d9b1a2c3e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcd',
  semillaFirma:
    '3046022100f1c39056a0c5bd3c591244e45d8b51d8b671a539bdf5c1b6b559d2ba96a09cb402210080bc4f7831f41da0b6e1476e3d0d8fb8ab81e5cd8e3df917300c3b313efbd261',
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

const mockSorteosLista: SorteoItemResumen[] = [
  {
    id: 1,
    tipo: 'TORNEO',
    titulo: 'Copa PICA 2026 - Eliminación Directa',
    slug: 'dev-copa-abierta',
    disciplinaOInfo: 'Fútbol 5 (8 equipos)',
    fechaSorteo: '2026-10-24T18:00:00Z',
    compromisoHash: mockTorneoVerificacion1.compromisoHash,
    semilla: mockTorneoVerificacion1.semilla,
  },
  {
    id: 2,
    tipo: 'TORNEO',
    titulo: 'Torneo Cerrado de Ajedrez UNLu',
    slug: 'dev-torneo-cerrado',
    disciplinaOInfo: 'Ajedrez (11 participantes, 5 BYEs)',
    fechaSorteo: '2026-10-25T14:30:00Z',
    compromisoHash: mockTorneoVerificacion2.compromisoHash,
    semilla: mockTorneoVerificacion2.semilla,
  },
  {
    id: 10,
    tipo: 'RIFA',
    titulo: 'Gran Rifa Benéfica de la Copa',
    disciplinaOInfo: '10 números vendidos, 3 premios',
    fechaSorteo: '2026-10-26T21:00:00Z',
    compromisoHash: mockRifaVerificacion10.compromisoHash,
    semilla: mockRifaVerificacion10.semilla,
  },
];

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export const verificacionHandlers = [
  http.get(`${API_URL}/verificacion/sorteos`, () => {
    return HttpResponse.json(mockSorteosLista);
  }),
  http.get('/verificacion/sorteos', () => {
    return HttpResponse.json(mockSorteosLista);
  }),

  http.get(`${API_URL}/verificacion/torneo/:id`, ({ params }) => {
    const id = Number(params.id);
    if (id === 2 || params.id === 'dev-torneo-cerrado') {
      return HttpResponse.json(mockTorneoVerificacion2);
    }
    return HttpResponse.json(mockTorneoVerificacion1);
  }),
  http.get('/verificacion/torneo/:id', ({ params }) => {
    const id = Number(params.id);
    if (id === 2 || params.id === 'dev-torneo-cerrado') {
      return HttpResponse.json(mockTorneoVerificacion2);
    }
    return HttpResponse.json(mockTorneoVerificacion1);
  }),

  http.get(`${API_URL}/verificacion/rifa/:id`, ({ params }) => {
    const id = Number(params.id);
    return HttpResponse.json({
      ...mockRifaVerificacion10,
      id: id || 10,
    });
  }),
  http.get('/verificacion/rifa/:id', ({ params }) => {
    const id = Number(params.id);
    return HttpResponse.json({
      ...mockRifaVerificacion10,
      id: id || 10,
    });
  }),
];

