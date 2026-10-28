import { http, HttpResponse } from 'msw';
import { TorneoDetalle, TorneoResumen } from '../torneos/types/torneo';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

type DetalleMock = Omit<
  TorneoDetalle,
  | 'premios'
  | 'reglamentoTexto'
  | 'pctGastosAdministrativos'
  | 'gastosAdministrativos'
  | 'totalAPagar'
> & {
  premios: { puesto: number; pct: number }[];
  esBorrador?: boolean;
};

const detalles: DetalleMock[] = [
  {
    id: 1,
    slug: 'dev-copa-abierta',
    nombre: 'Copa abierta',
    descripcion: 'Torneo de fútbol 5 por equipos con la inscripción abierta.',
    disciplina: 'Fútbol 5',
    formato: 'ELIMINACION_DIRECTA',
    modalidad: 'PRESENCIAL',
    tipoParticipante: 'EQUIPO',
    sede: 'Club UNLu',
    estado: 'INSCRIPCION_ABIERTA',
    cupoMaximo: 8,
    cupoMinimo: 2,
    cupoDisponible: 7,
    tamanioEquipo: 3,
    valorInscripcion: 5000.0,
    moneda: 'ARS',
    pozoEstimado: 48000.0,
    premios: [
      { puesto: 1, pct: 60.0 },
      { puesto: 2, pct: 30.0 },
      { puesto: 3, pct: 10.0 },
    ],
    cierreInscripcionEn: '2026-11-01T14:32:00Z',
    fechaInicio: '2026-11-04T14:32:00Z',
    fechaFin: null,
    reglamentoUrl: 'https://pica.local/reglamentos/dev-copa-abierta.pdf',
    reglamentoHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    organizador: {
      id: 2,
      nombreCompleto: 'Dev Organizador',
      username: 'dev_organizador',
    },
    publicadoEn: '2026-10-15T14:32:00Z',
  },
  {
    id: 2,
    slug: 'torneo-padel-estudiantes',
    nombre: 'Torneo de Pádel Interfacultades',
    descripcion:
      'Competencia en parejas categoría doble en canchas de blindex. Incluye hidratación y kit de bienvenida.',
    disciplina: 'Pádel',
    formato: 'FASE_GRUPOS_ELIMINACION',
    modalidad: 'PRESENCIAL',
    tipoParticipante: 'EQUIPO',
    sede: 'Complejo La Redonda',
    estado: 'INSCRIPCION_ABIERTA',
    cupoMaximo: 16,
    cupoMinimo: 8,
    cupoDisponible: 4,
    tamanioEquipo: 2,
    valorInscripcion: 8000.0,
    moneda: 'ARS',
    pozoEstimado: 120000.0,
    premios: [
      { puesto: 1, pct: 70.0 },
      { puesto: 2, pct: 30.0 },
    ],
    cierreInscripcionEn: '2026-11-10T20:00:00Z',
    fechaInicio: '2026-11-15T09:00:00Z',
    fechaFin: '2026-11-16T18:00:00Z',
    reglamentoUrl: 'https://pica.local/reglamentos/padel-interfacultades.pdf',
    reglamentoHash: '9a5f2e82b7814c11b02315bfae1136c3e390c9b4e5d6a782b1c4e9f012a45678',
    organizador: {
      id: 2,
      nombreCompleto: 'Dev Organizador',
      username: 'dev_organizador',
    },
    publicadoEn: '2026-10-18T10:00:00Z',
  },
  {
    id: 3,
    slug: 'liga-ajedrez-primavera',
    nombre: 'Liga Abierta de Ajedrez Rápido',
    descripcion:
      'Torneo individual suizo a 7 rondas con ritmo 15+10. Transmisión de tableros digitales y análisis post-partida.',
    disciplina: 'Ajedrez',
    formato: 'SUIZO',
    modalidad: 'HIBRIDA',
    tipoParticipante: 'INDIVIDUAL',
    sede: 'Salón de Usos Múltiples Central',
    estado: 'EN_CURSO',
    cupoMaximo: 32,
    cupoMinimo: 10,
    cupoDisponible: 0,
    tamanioEquipo: null,
    valorInscripcion: 2500.0,
    moneda: 'ARS',
    pozoEstimado: 75000.0,
    premios: [
      { puesto: 1, pct: 50.0 },
      { puesto: 2, pct: 30.0 },
      { puesto: 3, pct: 20.0 },
    ],
    cierreInscripcionEn: '2026-10-20T18:00:00Z',
    fechaInicio: '2026-10-22T15:00:00Z',
    fechaFin: '2026-10-29T21:00:00Z',
    reglamentoUrl: 'https://pica.local/reglamentos/ajedrez-primavera.pdf',
    reglamentoHash: '4355a46b19d348dc2f57c046f8ef63d4538ebb936000f3c9ee954a27460dd865',
    organizador: {
      id: 2,
      nombreCompleto: 'Dev Organizador',
      username: 'dev_organizador',
    },
    publicadoEn: '2026-10-05T12:00:00Z',
  },
  {
    id: 4,
    slug: 'copa-basquet-3x3',
    nombre: 'Copa Nocturna Básquet 3x3',
    descripcion:
      'Torneo relámpago en cancha abierta con iluminación led. Competencia de triples y show de entretiempo.',
    disciplina: 'Básquetbol',
    formato: 'ELIMINACION_DIRECTA',
    modalidad: 'PRESENCIAL',
    tipoParticipante: 'EQUIPO',
    sede: 'Playón Deportivo Norte',
    estado: 'INSCRIPCION_CERRADA',
    cupoMaximo: 12,
    cupoMinimo: 6,
    cupoDisponible: 0,
    tamanioEquipo: 4,
    valorInscripcion: 6000.0,
    moneda: 'ARS',
    pozoEstimado: 65000.0,
    premios: [
      { puesto: 1, pct: 60.0 },
      { puesto: 2, pct: 40.0 },
    ],
    cierreInscripcionEn: '2026-10-24T23:59:00Z',
    fechaInicio: '2026-10-28T19:00:00Z',
    fechaFin: '2026-10-28T23:30:00Z',
    reglamentoUrl: 'https://pica.local/reglamentos/basquet-3x3.pdf',
    reglamentoHash: null,
    organizador: {
      id: 2,
      nombreCompleto: 'Dev Organizador',
      username: 'dev_organizador',
    },
    publicadoEn: '2026-10-10T11:00:00Z',
  },
  {
    id: 5,
    slug: 'torneo-voley-clausura',
    nombre: 'Torneo Clausura de Vóley Mixto',
    descripcion: 'Edición clausura anual de vóley recreativo y competitivo.',
    disciplina: 'Vóley',
    formato: 'ELIMINACION_DIRECTA',
    modalidad: 'PRESENCIAL',
    tipoParticipante: 'EQUIPO',
    sede: 'Gimnasio Techado Principal',
    estado: 'FINALIZADO',
    cupoMaximo: 10,
    cupoMinimo: 4,
    cupoDisponible: 0,
    tamanioEquipo: 6,
    valorInscripcion: 4000.0,
    moneda: 'ARS',
    pozoEstimado: 40000.0,
    premios: [
      { puesto: 1, pct: 60.0 },
      { puesto: 2, pct: 30.0 },
      { puesto: 3, pct: 10.0 },
    ],
    cierreInscripcionEn: '2026-09-30T23:59:00Z',
    fechaInicio: '2026-10-05T09:00:00Z',
    fechaFin: '2026-10-12T20:00:00Z',
    reglamentoUrl: null,
    reglamentoHash: null,
    organizador: {
      id: 2,
      nombreCompleto: 'Dev Organizador',
      username: 'dev_organizador',
    },
    publicadoEn: '2026-09-15T10:00:00Z',
  },
  {
    id: 99,
    slug: 'copa-borrador-interna',
    nombre: 'Torneo Borrador Privado',
    descripcion: 'Este torneo está en borrador y no debe verse públicamente',
    disciplina: 'Tenis',
    formato: 'ELIMINACION_DIRECTA',
    modalidad: 'PRESENCIAL',
    tipoParticipante: 'INDIVIDUAL',
    sede: 'Canchas Polvo de Ladrillo',
    estado: 'INSCRIPCION_ABIERTA',
    cupoMaximo: 16,
    cupoMinimo: 4,
    cupoDisponible: 16,
    tamanioEquipo: 1,
    valorInscripcion: 10000,
    moneda: 'ARS',
    pozoEstimado: 160000,
    premios: [{ puesto: 1, pct: 100 }],
    cierreInscripcionEn: null,
    fechaInicio: null,
    fechaFin: null,
    reglamentoUrl: null,
    reglamentoHash: null,
    organizador: {
      id: 2,
      nombreCompleto: 'Dev Organizador',
      username: 'dev_organizador',
    },
    publicadoEn: null,
    esBorrador: true, // No publicado / Borrador
  },
];

/** Los montos se derivan como en el back: cada puesto es su % del pozo neto y los gastos administrativos (10 %) van aparte. */
export const mockTorneosDetalle: (TorneoDetalle & { esBorrador?: boolean })[] = detalles.map(
  (t) => ({
    ...t,
    reglamentoTexto: null,
    pctGastosAdministrativos: 10,
    gastosAdministrativos: t.valorInscripcion / 10,
    totalAPagar: t.valorInscripcion * 1.1,
    premios: t.premios.map((p) => ({ ...p, monto: (t.pozoEstimado * p.pct) / 100 })),
  })
);

export const torneoHandlers = [
  // GET /torneos/resumen (Público, sin sesión)
  http.get(`${API_URL}/torneos/resumen`, ({ request }) => {
    const url = new URL(request.url);
    const disciplina = url.searchParams.get('disciplina')?.toLowerCase();
    const estado = url.searchParams.get('estado');
    const page = parseInt(url.searchParams.get('page') || '0', 10);
    const size = parseInt(url.searchParams.get('size') || '20', 10);
    const sort = url.searchParams.get('sort');

    // Filtrar: excluir borradores siempre
    let filtered = mockTorneosDetalle.filter((t) => !t.esBorrador);

    if (disciplina) {
      filtered = filtered.filter((t) => t.disciplina.toLowerCase().includes(disciplina));
    }

    if (estado) {
      filtered = filtered.filter((t) => t.estado === estado);
    }

    // Ordenamiento opcional
    if (sort) {
      const [field, direction] = sort.split(',');
      const isAsc = direction?.toLowerCase() !== 'desc';
      filtered.sort((a, b) => {
        const valA: any = (a as any)[field];
        const valB: any = (b as any)[field];
        if (valA == null) return isAsc ? 1 : -1;
        if (valB == null) return isAsc ? -1 : 1;
        if (typeof valA === 'string') {
          return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return isAsc ? (valA > valB ? 1 : -1) : valA < valB ? 1 : -1;
      });
    }

    const totalElements = filtered.length;
    const totalPages = Math.ceil(totalElements / size) || 1;
    const startIndex = page * size;
    const pagedContent = filtered.slice(startIndex, startIndex + size);

    // Mapear a TorneoResumen
    const content: TorneoResumen[] = pagedContent.map((t) => ({
      id: t.id,
      slug: t.slug,
      nombre: t.nombre,
      descripcion: t.descripcion,
      disciplina: t.disciplina,
      formato: t.formato,
      modalidad: t.modalidad,
      tipoParticipante: t.tipoParticipante,
      sede: t.sede,
      estado: t.estado,
      cupoMaximo: t.cupoMaximo,
      cupoDisponible: t.cupoDisponible,
      valorInscripcion: t.valorInscripcion,
      gastosAdministrativos: t.gastosAdministrativos,
      moneda: t.moneda,
      pozoEstimado: t.pozoEstimado,
      cierreInscripcionEn: t.cierreInscripcionEn,
      fechaInicio: t.fechaInicio,
      fechaFin: t.fechaFin,
    }));

    return HttpResponse.json({
      content,
      page: {
        size,
        number: page,
        totalElements,
        totalPages,
      },
    });
  }),

  // GET /torneos/slug/:slug (Público, sin sesión)
  http.get(`${API_URL}/torneos/slug/:slug`, ({ params }) => {
    const { slug } = params;
    const torneo = mockTorneosDetalle.find((t) => t.slug === slug && !t.esBorrador);

    if (!torneo) {
      return new HttpResponse(
        JSON.stringify({
          status: 404,
          codigo: 'TORNEO_NO_ENCONTRADO',
          detail: `No se encontró el torneo con slug '${slug}' o se encuentra en estado borrador.`,
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/problem+json' },
        }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { esBorrador, ...torneoDetalle } = torneo;
    return HttpResponse.json(torneoDetalle);
  }),
];
