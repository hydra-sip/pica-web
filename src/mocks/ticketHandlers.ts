import { http, HttpResponse } from 'msw';
import { ReclamoRifa, TicketDetalle } from '../api/rifaApi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

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
    sorteadaEn: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    reclamo: null,
    esComprador: true,
    ventanaReclamoAbierta: true,
    horasRestantesParaReclamar: 43,
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
    sorteadaEn: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    reclamo: null,
    esComprador: true,
    ventanaReclamoAbierta: false,
    horasRestantesParaReclamar: 0,
  },

  // Ticket 1003: Rifa 30 de otro comprador (usuario no es comprador)
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
    sorteadaEn: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    reclamo: null,
    esComprador: false,
    ventanaReclamoAbierta: true,
    horasRestantesParaReclamar: 38,
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
    sorteadaEn: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    reclamo: {
      id: 501,
      rifaId: 40,
      usuarioId: 1,
      usuarioNombre: 'Usuario Participante',
      ticketId: 1004,
      motivo: 'Discrepancia detectada en la semilla publicada del sorteo',
      estado: 'PENDIENTE',
      creadoEn: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    },
    esComprador: true,
    ventanaReclamoAbierta: true,
    horasRestantesParaReclamar: 36,
  },
});

let mockTickets = crearTicketsIniciales();
let mockReclamos: Record<number, ReclamoRifa[]> = {
  40: [mockTickets[1004].reclamo!],
};

export const resetTicketsMock = () => {
  mockTickets = crearTicketsIniciales();
  mockReclamos = {
    40: [mockTickets[1004].reclamo!],
  };
};

export const ticketHandlers = [
  // GET /tickets/mis-tickets (debe ir antes de /tickets/:id para no ser capturado como parámetro)
  http.get(`${API_URL}/tickets/mis-tickets`, () => {
    return HttpResponse.json(
      Object.values(mockTickets).filter(
        (t) => t.compradorId === 1 || t.compradorId === 2 || t.compradorUsername === 'usuario'
      )
    );
  }),
  http.get('/tickets/mis-tickets', () => {
    return HttpResponse.json(
      Object.values(mockTickets).filter(
        (t) => t.compradorId === 1 || t.compradorId === 2 || t.compradorUsername === 'usuario'
      )
    );
  }),

  // GET /tickets/:id
  http.get(`${API_URL}/tickets/:id`, ({ params }) => {
    const id = Number(params.id);
    const ticket = mockTickets[id];
    if (!ticket) {
      return new HttpResponse(
        JSON.stringify({
          status: 404,
          codigo: 'TICKET_NO_ENCONTRADO',
          detail: 'El ticket solicitado no existe.',
        }),
        { status: 404, headers: { 'Content-Type': 'application/problem+json' } }
      );
    }
    return HttpResponse.json(ticket);
  }),
  http.get('/tickets/:id', ({ params }) => {
    const id = Number(params.id);
    const ticket = mockTickets[id];
    if (!ticket) {
      return new HttpResponse(
        JSON.stringify({
          status: 404,
          codigo: 'TICKET_NO_ENCONTRADO',
          detail: 'El ticket solicitado no existe.',
        }),
        { status: 404, headers: { 'Content-Type': 'application/problem+json' } }
      );
    }
    return HttpResponse.json(ticket);
  }),

  // GET /rifas/:id/reclamos
  http.get(`${API_URL}/rifas/:id/reclamos`, ({ params }) => {
    const rifaId = Number(params.id);
    return HttpResponse.json(mockReclamos[rifaId] || []);
  }),
  http.get('/rifas/:id/reclamos', ({ params }) => {
    const rifaId = Number(params.id);
    return HttpResponse.json(mockReclamos[rifaId] || []);
  }),

  // POST /rifas/:id/reclamos (HU-506)
  http.post(`${API_URL}/rifas/:id/reclamos`, async ({ params, request }) => {
    const rifaId = Number(params.id);
    const body = (await request.json().catch(() => ({}))) as {
      motivo?: string;
      ticketId?: number;
    };

    // Validación motivo
    if (!body.motivo || !body.motivo.trim()) {
      return new HttpResponse(
        JSON.stringify({
          status: 400,
          codigo: 'VALIDACION',
          detail: 'El motivo del reclamo es obligatorio.',
          campos: { motivo: 'Es obligatorio.' },
        }),
        { status: 400, headers: { 'Content-Type': 'application/problem+json' } }
      );
    }

    // Criterio 1: pasadas las 48 horas
    if (rifaId === 20) {
      return new HttpResponse(
        JSON.stringify({
          status: 409,
          codigo: 'RECLAMO_FUERA_DE_VENTANA',
          detail: 'La ventana de 48 horas para reclamar el resultado de la rifa ya cerró.',
        }),
        { status: 409, headers: { 'Content-Type': 'application/problem+json' } }
      );
    }

    // Criterio 2: sin haber comprado un ticket
    if (rifaId === 30) {
      return new HttpResponse(
        JSON.stringify({
          status: 403,
          codigo: 'NO_ES_COMPRADOR',
          detail: 'No podés reclamar: no tenés un ticket comprado para esta rifa.',
        }),
        { status: 403, headers: { 'Content-Type': 'application/problem+json' } }
      );
    }

    // Criterio 3 y 4: dentro de la ventana de 48 horas
    const nuevoReclamo: ReclamoRifa = {
      id: Math.floor(Math.random() * 10000) + 700,
      rifaId,
      usuarioId: 1,
      usuarioNombre: 'Usuario Participante',
      ticketId: body.ticketId || 1001,
      motivo: body.motivo.trim(),
      estado: 'PENDIENTE',
      creadoEn: new Date().toISOString(),
    };

    // Actualizar estado de la rifa a EN_REVISION y registrar en los tickets correspondientes
    if (!mockReclamos[rifaId]) {
      mockReclamos[rifaId] = [];
    }
    mockReclamos[rifaId].push(nuevoReclamo);

    // Actualizar estado en tickets de esa rifa
    Object.values(mockTickets).forEach((t) => {
      if (t.rifaId === rifaId) {
        t.rifaEstado = 'EN_REVISION';
        if (t.id === (body.ticketId || 1001)) {
          t.reclamo = nuevoReclamo;
        }
      }
    });

    return HttpResponse.json(nuevoReclamo, { status: 201 });
  }),
  http.post('/rifas/:id/reclamos', async ({ params, request }) => {
    const rifaId = Number(params.id);
    const body = (await request.json().catch(() => ({}))) as {
      motivo?: string;
      ticketId?: number;
    };

    if (!body.motivo || !body.motivo.trim()) {
      return new HttpResponse(
        JSON.stringify({
          status: 400,
          codigo: 'VALIDACION',
          detail: 'El motivo del reclamo es obligatorio.',
          campos: { motivo: 'Es obligatorio.' },
        }),
        { status: 400, headers: { 'Content-Type': 'application/problem+json' } }
      );
    }

    if (rifaId === 20) {
      return new HttpResponse(
        JSON.stringify({
          status: 409,
          codigo: 'RECLAMO_FUERA_DE_VENTANA',
          detail: 'La ventana de 48 horas para reclamar el resultado de la rifa ya cerró.',
        }),
        { status: 409, headers: { 'Content-Type': 'application/problem+json' } }
      );
    }

    if (rifaId === 30) {
      return new HttpResponse(
        JSON.stringify({
          status: 403,
          codigo: 'NO_ES_COMPRADOR',
          detail: 'No podés reclamar: no tenés un ticket comprado para esta rifa.',
        }),
        { status: 403, headers: { 'Content-Type': 'application/problem+json' } }
      );
    }

    const nuevoReclamo: ReclamoRifa = {
      id: Math.floor(Math.random() * 10000) + 700,
      rifaId,
      usuarioId: 1,
      usuarioNombre: 'Usuario Participante',
      ticketId: body.ticketId || 1001,
      motivo: body.motivo.trim(),
      estado: 'PENDIENTE',
      creadoEn: new Date().toISOString(),
    };

    if (!mockReclamos[rifaId]) {
      mockReclamos[rifaId] = [];
    }
    mockReclamos[rifaId].push(nuevoReclamo);

    Object.values(mockTickets).forEach((t) => {
      if (t.rifaId === rifaId) {
        t.rifaEstado = 'EN_REVISION';
        if (t.id === (body.ticketId || 1001)) {
          t.reclamo = nuevoReclamo;
        }
      }
    });

    return HttpResponse.json(nuevoReclamo, { status: 201 });
  }),
];
