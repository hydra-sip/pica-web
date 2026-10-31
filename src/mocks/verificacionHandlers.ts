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

// Rifa 10 sorteada, como la devuelve GET /rifas/publicas/{id}/sorteo: los hashes y los ganadores
// son los que da el algoritmo real, así el portal la verifica de punta a punta
export const mockRifaVerificacion10: RifaVerificacionData = {
  id: 10,
  titulo: 'Gran Rifa Benéfica de la Copa',
  torneoNombre: 'Copa PICA 2026 - Eliminación Directa',
  fechaSorteo: '2026-10-26T21:00:00Z',
  listaHash: '059f191ae46c2ce332ebaf49f125bcb3fc89308049e1700a98d7a87b3d36a07d',
  listaSelladaEn: '2026-10-25T21:00:00Z',
  lista: [
    { numero: 7, ticketCodigo: 'R10-K7MPQ2' },
    { numero: 14, ticketCodigo: 'R10-K7MPQ2' },
    { numero: 21, ticketCodigo: 'R10-T4XWZ9' },
    { numero: 35, ticketCodigo: 'R10-B8HNR3' },
    { numero: 42, ticketCodigo: 'R10-B8HNR3' },
    { numero: 59, ticketCodigo: 'R10-B8HNR3' },
    { numero: 73, ticketCodigo: 'R10-M2DCV6' },
    { numero: 88, ticketCodigo: 'R10-Q9JFL5' },
    { numero: 92, ticketCodigo: 'R10-Q9JFL5' },
    { numero: 105, ticketCodigo: 'R10-W3GYT8' },
  ],
  compromisoHash: '124775535e5e5a4b8201471ea119df6391dab54ed8e97614f8265b80c60dd5dc',
  compromisoPublicadoEn: '2026-10-25T21:00:00Z',
  semilla: '9f2c6e1d4b8a7f3e0c5d2a9b6e1f4c7d8a3b0e5f2c9d6a1b4e7f0c3d8a5b2e9f',
  semillaFirma: null,
  semillaObtenidaEn: '2026-10-26T21:00:05Z',
  premios: [
    {
      puesto: 1,
      descripcion: 'Camiseta Oficial Autografiada',
      pct: 60,
      numeroGanador: 14,
      ganador: 'mati_rios',
    },
    {
      puesto: 2,
      descripcion: 'Kit Deportivo Profesional',
      pct: 30,
      numeroGanador: 88,
      ganador: 'lucia.fer',
    },
    {
      puesto: 3,
      descripcion: 'Entradas VIP para la Final',
      pct: 10,
      numeroGanador: 7,
      ganador: 'mati_rios',
    },
  ],
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
  // GET /rifas/publicas/sorteadas y /rifas/publicas/{id}/sorteo: solo la rifa 10 está sorteada
  http.get(`${API_URL}/rifas/publicas/sorteadas`, () => {
    const { id, titulo, torneoNombre, semillaObtenidaEn } = mockRifaVerificacion10;
    return HttpResponse.json({
      content: [{ id, titulo, torneoNombre, semillaObtenidaEn }],
      page: { size: 50, number: 0, totalElements: 1, totalPages: 1 },
    });
  }),

  http.get(`${API_URL}/rifas/publicas/:id/sorteo`, ({ params }) => {
    if (Number(params.id) !== mockRifaVerificacion10.id) {
      return HttpResponse.json(
        { status: 409, codigo: 'RIFA_NO_SORTEADA', detail: 'La rifa todavía no se sorteó.' },
        { status: 409, headers: { 'Content-Type': 'application/problem+json' } }
      );
    }
    return HttpResponse.json(mockRifaVerificacion10);
  }),

  // GET /torneos/{id}/bracket (público); los demás torneos del catálogo simulado no tienen bracket
  http.get(`${API_URL}/torneos/:id/bracket`, ({ params }) => {
    const sorteo = sorteos[Number(params.id)];
    if (!sorteo) {
      return HttpResponse.json({
        torneoId: Number(params.id),
        semilla: null,
        listaHash: null,
        rondas: [],
      });
    }
    return HttpResponse.json(bracketDe(sorteo));
  }),
];
