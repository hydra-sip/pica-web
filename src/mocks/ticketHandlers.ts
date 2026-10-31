import { http, HttpResponse } from 'msw';
import { ReclamoRifa, TicketDetalle } from '../api/rifaApi';
import { problema, validacion } from './adminHandlers';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const haceHoras = (horas: number) => new Date(Date.now() - horas * 3600 * 1000).toISOString();

// Base mock tickets
export const crearTicketsIniciales = (): Record<number, TicketDetalle> => ({
  // Ticket 1001: Rifa 10 sorteada hace 5 horas (dentro de las 48h), comprador actual, sin reclamo
  1001: {
    id: 1001,
    codigo: 'SEED-0001',
    rifaId: 10,
    rifaTitulo: 'Gran Rifa Benéfica de la Copa',
    torneoId: 1,
    torneoNombre: 'Copa PICA 2026',
    compradorId: 1,
    compradorNombre: 'Usuario Participante',
    compradorUsername: 'usuario',
    numeros: [14, 25, 42],
    monto: 3000,
    comision: 150,
    moneda: 'ARS',
    creadoEn: '2026-10-24T12:00:00Z',
    rifaEstado: 'SORTEADA',
    sorteadaEn: haceHoras(5),
    esComprador: true,
    ventanaReclamoAbierta: true,
    premiosGanados: [],
  },

  // Ticket 1002: Rifa 20 sorteada hace 72 horas (fuera de las 48h)
  1002: {
    id: 1002,
    codigo: 'T-VENCIDO',
    rifaId: 20,
    rifaTitulo: 'Rifa con Ventana Vencida',
    torneoId: null,
    torneoNombre: null,
    compradorId: 1,
    compradorNombre: 'Usuario Participante',
    compradorUsername: 'usuario',
    numeros: [7, 88],
    monto: 2000,
    comision: 100,
    moneda: 'ARS',
    creadoEn: '2026-10-20T10:00:00Z',
    rifaEstado: 'SORTEADA',
    sorteadaEn: haceHoras(72),
    esComprador: true,
    ventanaReclamoAbierta: false,
    premiosGanados: [],
  },

  // Ticket 1003: Rifa 30 de otro comprador, como lo ve un administrador (esComprador en false)
  1003: {
    id: 1003,
    codigo: 'T-AJENO',
    rifaId: 30,
    rifaTitulo: 'Rifa de Otro Usuario',
    torneoId: null,
    torneoNombre: null,
    compradorId: 999,
    compradorNombre: 'Comprador Desconocido',
    compradorUsername: 'desconocido',
    numeros: [9],
    monto: 1000,
    comision: 50,
    moneda: 'ARS',
    creadoEn: '2026-10-25T14:00:00Z',
    rifaEstado: 'SORTEADA',
    sorteadaEn: haceHoras(10),
    esComprador: false,
    ventanaReclamoAbierta: true,
    premiosGanados: [],
  },

  // Ticket 1004: Rifa 40 ya en revisión con reclamo pendiente
  1004: {
    id: 1004,
    codigo: 'T-EN-REVISION',
    rifaId: 40,
    rifaTitulo: 'Rifa en Revisión por Disputa',
    torneoId: null,
    torneoNombre: null,
    compradorId: 1,
    compradorNombre: 'Usuario Participante',
    compradorUsername: 'usuario',
    numeros: [33],
    monto: 1000,
    comision: 50,
    moneda: 'ARS',
    creadoEn: '2026-10-25T14:00:00Z',
    rifaEstado: 'EN_REVISION',
    sorteadaEn: haceHoras(12),
    esComprador: true,
    ventanaReclamoAbierta: true,
    premiosGanados: [],
  },
});

// GET /rifas/{id}/reclamos: quien no organiza ve solo los suyos (el usuario del mock es el 1)
const crearReclamosIniciales = (): Record<number, ReclamoRifa[]> => ({
  40: [
    {
      id: 501,
      rifaId: 40,
      usuarioId: 1,
      motivo: 'Discrepancia detectada en la semilla publicada del sorteo',
      estado: 'PENDIENTE',
      resolucion: null,
      resueltoEn: null,
      resueltoPor: null,
      creadoEn: haceHoras(2),
    },
  ],
});

let mockTickets = crearTicketsIniciales();
let mockReclamos = crearReclamosIniciales();

export const resetTicketsMock = () => {
  mockTickets = crearTicketsIniciales();
  mockReclamos = crearReclamosIniciales();
};

export const ticketHandlers = [
  // GET /tickets/mis-tickets (debe ir antes de /tickets/:id para no ser capturado como parámetro)
  http.get(`${API_URL}/tickets/mis-tickets`, () =>
    HttpResponse.json(Object.values(mockTickets).filter((t) => t.compradorId === 1))
  ),

  // GET /tickets/:id
  http.get(`${API_URL}/tickets/:id`, ({ params }) => {
    const ticket = mockTickets[Number(params.id)];
    if (!ticket) {
      return problema(404, 'TICKET_NO_ENCONTRADO', `No existe el ticket ${params.id}`);
    }
    return HttpResponse.json(ticket);
  }),

  // GET /rifas/:id/reclamos
  http.get(`${API_URL}/rifas/:id/reclamos`, ({ params }) =>
    HttpResponse.json(mockReclamos[Number(params.id)] || [])
  ),

  // POST /rifas/:id/reclamos (HU-506): mismos códigos que ReclamoRifaService
  http.post(`${API_URL}/rifas/:id/reclamos`, async ({ params, request }) => {
    const rifaId = Number(params.id);
    const body = (await request.json().catch(() => ({}))) as { motivo?: string };

    if (!body.motivo || !body.motivo.trim()) {
      return validacion([{ campo: 'motivo', codigo: 'REQUERIDO', mensaje: 'Falta el motivo' }]);
    }

    const ticket = Object.values(mockTickets).find((t) => t.rifaId === rifaId);
    if (!ticket || ticket.compradorId !== 1) {
      return problema(
        403,
        'NO_ES_COMPRADOR',
        `Solo los compradores de la rifa ${rifaId} pueden presentar reclamos`
      );
    }
    if (!ticket.ventanaReclamoAbierta) {
      return problema(
        409,
        'PLAZO_RECLAMO_VENCIDO',
        `Venció el plazo de 48 horas para reclamar el resultado de la rifa ${rifaId}`
      );
    }
    const reclamos = mockReclamos[rifaId] || [];
    if (reclamos.some((r) => r.usuarioId === 1 && r.estado === 'PENDIENTE')) {
      return problema(
        409,
        'RECLAMO_DUPLICADO',
        `El usuario ya tiene un reclamo pendiente en la rifa ${rifaId}`
      );
    }

    const nuevoReclamo: ReclamoRifa = {
      id: 700 + reclamos.length + 1,
      rifaId,
      usuarioId: 1,
      motivo: body.motivo.trim(),
      estado: 'PENDIENTE',
      resolucion: null,
      resueltoEn: null,
      resueltoPor: null,
      creadoEn: new Date().toISOString(),
    };
    mockReclamos[rifaId] = [...reclamos, nuevoReclamo];

    // La rifa pasa a EN_REVISION para todos sus tickets
    Object.values(mockTickets).forEach((t) => {
      if (t.rifaId === rifaId) {
        t.rifaEstado = 'EN_REVISION';
      }
    });

    return HttpResponse.json(nuevoReclamo, { status: 201 });
  }),
];
