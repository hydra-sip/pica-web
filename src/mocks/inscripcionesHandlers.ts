import { http, HttpResponse } from 'msw';
import type {
  EquipoInscripto,
  EstadoInscripcion,
  InscripcionDetalle,
  TorneoDeInscripcion,
} from '../api/inscripcionApi';
import type { UsuarioPublico } from '../api/jugadorApi';
import type { TorneoDetalle } from '../torneos/types/torneo';
import { type ErrorCampo, problema, validacion } from './adminHandlers';

// Inscripción en dos pasos (PICA-211) en memoria: equipos propios, búsqueda de jugadores, torneo por
// slug (TorneoDetalle del contrato público), y las inscripciones con su máquina de estados, según
// pica-back/docs/api/openapi.yaml. Se reinicia al recargar la página y, en las pruebas, con
// `reiniciarInscripciones()`.
//
// Torneos de ejemplo (GET /torneos/slug/{slug}); todos están abiertos salvo `torneo-cerrado`:
//   torneo-apertura-f5     Por equipos con costo, como el wireframe: "Torneo Apertura F5", nómina de 5 a 7
//                          (5 titulares + 2 suplentes), $ 20.000, cupo 16 (quedan 10).
//   individual-pago        Individual con costo: $ 5.000, cupo 32.
//   torneo-gratis          Por equipos gratis (nómina de 3 a 4): confirmar deja la inscripción CONFIRMADA.
//   individual-gratis      Individual gratis.
//   torneo-cupo-completo   Por equipos con costo (3 a 4, $ 15.000) sin lugar: confirmar pasa a
//                          PENDIENTE_PAGO y el pago responde 409 CUPO_COMPLETO.
//   torneo-cobro-rechazado Por equipos con costo (3 a 4, $ 15.000) donde el pago siempre responde
//                          409 COBRO_RECHAZADO y la inscripción sigue PENDIENTE_PAGO.
//   torneo-cerrado         Con la inscripción cerrada: crear, editar, confirmar y pagar responden
//                          409 INSCRIPCION_NO_ABIERTA.
//   copa-de-invierno       Por equipos con costo (3 a 4, $ 15.000), abierto: Deportivo Luján ya está
//                          inscripto y confirmado (inscripción 902), con dos reemplazos.
//   copa-sin-lugar         Por equipos, abierto pero con el cupo completo: Los Galácticos confirmados
//                          (inscripción 903) ocupan el último lugar. Reemplazar responde 409
//                          INSCRIPCION_NO_ABIERTA.
//   copa-cerrada           Por equipos con la inscripción cerrada (antes de la fecha de cierre): Los
//                          Galácticos confirmados (inscripción 904). Reemplazar responde 409
//                          INSCRIPCION_NO_ABIERTA.
//   Cualquier otro slug: este handler lo deja pasar y lo atiende el de los torneos públicos
//   (torneoHandlers.ts), que responde su propio 404 TORNEO_NO_ENCONTRADO.
// Cada inscripción (detalle y resumen) trae `torneo {id, nombre, slug}` del torneo de esta lista.
//
// Datos de ejemplo:
//   - El capitán es el usuario de la sesión (en los mocks, `usuario` / `user123`, id 2, con
//     INSCRIPCION_GESTIONAR). `organizador` / `org123` no tiene el permiso: 403 SIN_PERMISO.
//   - Sus equipos (GET /equipos/mios): Deportivo Luján, Los Galácticos y Los Halcones. Los Halcones
//     ya tienen una inscripción CANCELADA en torneo-apertura-f5 (no pueden reinscribirse ahí).
//   - En torneo-apertura-f5 hay una inscripción CONFIRMADA de otro equipo ("Los Rivales", capitán Carlos
//     Rivas) con Sofía Martínez, Pablo López, Ana Rodríguez y Juan Pérez: sumar a cualquiera de los cinco
//     responde 409 JUGADOR_YA_INSCRIPTO.
//   - En copa-de-invierno, Deportivo Luján está CONFIRMADA (902) con el capitán, Joaquín Gómez y Salvador
//     Báez. Su historial (GET /inscripciones/902/reemplazos) tiene dos reemplazos del capitán: salió Lucas
//     Fernández y entró Joaquín Gómez, y después salió Matías Rossi y entró Salvador Báez.
//   - Jugadores (GET /usuarios?q=, mínimo 3 caracteres, solo activos): Lucas Fernández (lucas_f99),
//     Matías Rossi (mrossi), Joaquín Gómez (joaco_g), Salvador Báez (salva_b), Sofía Martínez (sofi_m),
//     Pablo López (pablo_l), Ana Rodríguez (ana_r), Juan Pérez (juanp), Carlos Rivas (rival_c),
//     Zoe Bloqueada (zoe_b: al sumarla, 403 USUARIO_BLOQUEADO) y Tomás Tardío (tardio_t: aparece
//     activo pero al guardar o confirmar responde 409 USUARIO_NO_ACTIVO).
//
// Reglas que respeta, como el back: el equipo tiene una sola inscripción por torneo en cualquier
// estado (incluida CANCELADA); en un torneo individual un usuario puede tener varios borradores pero
// una sola inscripción activa; el cupo se chequea en firme al pagar (en un torneo con costo,
// confirmar no lo chequea; en uno gratis, sí); una inscripción es de su dueño (de otro usuario, 404).

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const PERMISO = 'INSCRIPCION_GESTIONAR';

/** Lo que estos handlers necesitan de la sesión de los mocks (la define handlers.ts). */
export interface SesionMock {
  usuario: { id: number; username: string; estado: string };
  persona: { nombres?: string; apellidos?: string };
  permisos: string[];
}

type Cuerpo = Record<string, unknown>;

// --- datos ------------------------------------------------------------------------------------

/** El torneo de la API más lo que el mock necesita para simular a los demás participantes. */
interface TorneoMock extends TorneoDetalle {
  /** Jugadores máximos de la nómina; el back lo valida, pero el contrato público del torneo no lo trae. */
  nominaMaxima: number | null;
  /** Inscripciones confirmadas de otros equipos que no están en el mock (ocupan cupo). */
  ocupadasAparte: number;
  /** El pago siempre se rechaza. */
  cobroRechazado?: boolean;
}

interface EquipoMock extends EquipoInscripto {
  capitanId: number;
}

interface InscripcionMock {
  id: number;
  torneoId: number;
  /** Quien se inscribió; en una de equipo es el capitán. */
  duenioId: number;
  /** Solo en la individual. */
  usuarioId: number | null;
  equipoId: number | null;
  /** Ids de los jugadores, el capitán incluido y primero. Solo en la de equipo. */
  nomina: number[] | null;
  estado: EstadoInscripcion;
  reglamentoAceptadoEn: string | null;
  creadoEn: string;
  modificadoEn: string;
}

/** Un reemplazo del historial: los usuarios van por id. */
interface ReemplazoMock {
  inscripcionId: number;
  saleId: number;
  entraId: number;
  reemplazadoEn: string;
  realizadoPorId: number;
}

interface JugadorMock extends UsuarioPublico {
  /** Con un bloqueo vigente: figura en la búsqueda pero no se lo puede inscribir. */
  bloqueado?: boolean;
  /** Pasa a inactivo después de buscarlo: al guardar o confirmar, USUARIO_NO_ACTIVO. */
  inactivoAlGuardar?: boolean;
}

const CIERRE_ABIERTO = '2030-12-31T23:59:00Z';
const CIERRE_PASADO = '2026-01-15T23:59:00Z';
const FECHA_INICIO = '2031-01-10T15:00:00Z';
const HACE_UN_RATO = '2026-10-20T15:00:00Z';

/** Los gastos administrativos salen del valor y el % del torneo, como en el back. */
const conGastos = (t: TorneoMock): TorneoMock => {
  const gastos = (t.valorInscripcion * (t.pctGastosAdministrativos ?? 0)) / 100;
  return { ...t, gastosAdministrativos: gastos, totalAPagar: t.valorInscripcion + gastos };
};

const torneo = (
  id: number,
  slug: string,
  nombre: string,
  extra: Partial<TorneoMock>
): TorneoMock => conGastos({
  id,
  slug,
  nombre,
  descripcion: null,
  disciplina: 'Fútbol 5',
  formato: 'ELIMINACION_DIRECTA',
  modalidad: 'PRESENCIAL',
  tipoParticipante: 'EQUIPO',
  sede: 'Club UNLu',
  cupoMaximo: 16,
  cupoMinimo: 8,
  cupoDisponible: 16,
  tamanioEquipo: 3,
  nominaMaxima: 4,
  valorInscripcion: 15000,
  moneda: 'ARS',
  pctGastosAdministrativos: null,
  gastosAdministrativos: 0,
  totalAPagar: 0,
  pozoEstimado: 0,
  premios: [],
  cierreInscripcionEn: CIERRE_ABIERTO,
  fechaInicio: FECHA_INICIO,
  fechaFin: null,
  reglamentoTexto: null,
  reglamentoUrl: `https://example.com/reglamentos/${slug}.pdf`,
  reglamentoHash: null,
  organizador: { id: 4, nombreCompleto: 'Organizador Eventos', username: 'organizador' },
  publicadoEn: HACE_UN_RATO,
  estado: 'INSCRIPCION_ABIERTA',
  ocupadasAparte: 0,
  ...extra,
});

const INDIVIDUAL = {
  tipoParticipante: 'INDIVIDUAL',
  tamanioEquipo: null,
  nominaMaxima: null,
} as const;

const TORNEOS: TorneoMock[] = [
  torneo(1, 'torneo-apertura-f5', 'Torneo Apertura F5', {
    tamanioEquipo: 5,
    nominaMaxima: 7,
    valorInscripcion: 20000,
    pctGastosAdministrativos: 10,
    ocupadasAparte: 5,
  }),
  torneo(2, 'individual-pago', 'Desafío Individual de Ping Pong', {
    ...INDIVIDUAL,
    cupoMaximo: 32,
    cupoMinimo: 8,
    valorInscripcion: 5000,
    ocupadasAparte: 12,
  }),
  torneo(3, 'torneo-gratis', 'Torneo Amistoso 3x3', {
    cupoMaximo: 8,
    cupoMinimo: 4,
    valorInscripcion: 0,
    ocupadasAparte: 3,
  }),
  torneo(4, 'individual-gratis', 'Maratón Abierta', {
    ...INDIVIDUAL,
    cupoMaximo: 50,
    cupoMinimo: 10,
    valorInscripcion: 0,
    ocupadasAparte: 20,
  }),
  torneo(5, 'torneo-cupo-completo', 'Copa Lleno Total', {
    cupoMaximo: 8,
    cupoMinimo: 4,
    ocupadasAparte: 8,
  }),
  torneo(6, 'torneo-cobro-rechazado', 'Copa Tarjeta Dura', {
    cupoMaximo: 8,
    cupoMinimo: 4,
    cobroRechazado: true,
  }),
  torneo(7, 'torneo-cerrado', 'Torneo Clausura 2025', {
    estado: 'INSCRIPCION_CERRADA',
    cierreInscripcionEn: CIERRE_PASADO,
  }),
  torneo(8, 'copa-de-invierno', 'Copa de Invierno', {}),
  torneo(9, 'copa-sin-lugar', 'Copa Sin Lugar', {
    cupoMaximo: 8,
    cupoMinimo: 4,
    ocupadasAparte: 7,
  }),
  torneo(10, 'copa-cerrada', 'Copa Cerrada', { estado: 'INSCRIPCION_CERRADA' }),
];

const jugador = (
  id: number,
  username: string,
  nombres: string,
  apellidos: string,
  extra: Partial<JugadorMock> = {}
): JugadorMock => ({ id, username, nombres, apellidos, ...extra });

const JUGADORES: JugadorMock[] = [
  jugador(101, 'lucas_f99', 'Lucas', 'Fernández'),
  jugador(102, 'mrossi', 'Matías', 'Rossi'),
  jugador(103, 'joaco_g', 'Joaquín', 'Gómez'),
  jugador(104, 'salva_b', 'Salvador', 'Báez'),
  jugador(105, 'sofi_m', 'Sofía', 'Martínez'),
  jugador(106, 'pablo_l', 'Pablo', 'López'),
  jugador(107, 'ana_r', 'Ana', 'Rodríguez'),
  jugador(108, 'juanp', 'Juan', 'Pérez'),
  jugador(109, 'zoe_b', 'Zoe', 'Bloqueada', { bloqueado: true }),
  jugador(110, 'rival_c', 'Carlos', 'Rivas'),
  jugador(111, 'tardio_t', 'Tomás', 'Tardío', { inactivoAlGuardar: true }),
];

// El usuario de la sesión de los mocks que se inscribe: `usuario` (handlers.ts).
const CAPITAN = 2;

const estadoInicial = () => ({
  equipos: [
    { id: 1, nombre: 'Los Galácticos', capitanId: CAPITAN },
    { id: 2, nombre: 'Los Halcones', capitanId: CAPITAN },
    { id: 3, nombre: 'Deportivo Luján', capitanId: CAPITAN },
    { id: 10, nombre: 'Los Rivales', capitanId: 110 },
  ] as EquipoMock[],
  inscripciones: [
    {
      id: 900,
      torneoId: 1,
      duenioId: 110,
      usuarioId: null,
      equipoId: 10,
      nomina: [110, 105, 106, 107, 108],
      estado: 'CONFIRMADA',
      reglamentoAceptadoEn: HACE_UN_RATO,
      creadoEn: HACE_UN_RATO,
      modificadoEn: HACE_UN_RATO,
    },
    {
      id: 901,
      torneoId: 1,
      duenioId: CAPITAN,
      usuarioId: null,
      equipoId: 2,
      nomina: [CAPITAN, 101],
      estado: 'CANCELADA',
      reglamentoAceptadoEn: null,
      creadoEn: HACE_UN_RATO,
      modificadoEn: HACE_UN_RATO,
    },
    {
      id: 902,
      torneoId: 8,
      duenioId: CAPITAN,
      usuarioId: null,
      equipoId: 3,
      nomina: [CAPITAN, 103, 104],
      estado: 'CONFIRMADA',
      reglamentoAceptadoEn: HACE_UN_RATO,
      creadoEn: HACE_UN_RATO,
      modificadoEn: HACE_UN_RATO,
    },
    {
      id: 903,
      torneoId: 9,
      duenioId: CAPITAN,
      usuarioId: null,
      equipoId: 1,
      nomina: [CAPITAN, 101, 102],
      estado: 'CONFIRMADA',
      reglamentoAceptadoEn: HACE_UN_RATO,
      creadoEn: HACE_UN_RATO,
      modificadoEn: HACE_UN_RATO,
    },
    {
      id: 904,
      torneoId: 10,
      duenioId: CAPITAN,
      usuarioId: null,
      equipoId: 1,
      nomina: [CAPITAN, 101, 102],
      estado: 'CONFIRMADA',
      reglamentoAceptadoEn: HACE_UN_RATO,
      creadoEn: HACE_UN_RATO,
      modificadoEn: HACE_UN_RATO,
    },
  ] as InscripcionMock[],
  reemplazos: [
    {
      inscripcionId: 902,
      saleId: 101,
      entraId: 103,
      reemplazadoEn: '2026-10-21T14:05:00Z',
      realizadoPorId: CAPITAN,
    },
    {
      inscripcionId: 902,
      saleId: 102,
      entraId: 104,
      reemplazadoEn: '2026-10-22T18:30:00Z',
      realizadoPorId: CAPITAN,
    },
  ] as ReemplazoMock[],
  siguienteEquipo: 100,
  siguienteInscripcion: 1000,
});

let estado = estadoInicial();

/** Vuelve los equipos y las inscripciones al estado inicial; las pruebas lo llaman entre test y test. */
export const reiniciarInscripciones = () => {
  estado = estadoInicial();
};

// --- ayudas -----------------------------------------------------------------------------------

const ahora = () => new Date().toISOString();
const idDe = (params: Record<string, unknown>) => Number(params.id);

const ACTIVAS: EstadoInscripcion[] = ['PENDIENTE_PAGO', 'CONFIRMADA'];
const esActiva = (i: InscripcionMock) => ACTIVAS.includes(i.estado);

const sinAcentos = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const pagina = <T>(items: T[], url: URL) => {
  const size = Math.min(Math.max(Number(url.searchParams.get('size') ?? 20) || 20, 1), 100);
  const number = Math.max(Number(url.searchParams.get('page') ?? 0) || 0, 0);
  return HttpResponse.json({
    content: items.slice(number * size, (number + 1) * size),
    page: { size, number, totalElements: items.length, totalPages: Math.ceil(items.length / size) },
  });
};

const conflicto = (codigo: string, detail: string) => problema(409, codigo, detail);
const prohibido = (codigo: string, detail: string) => problema(403, codigo, detail);
const noEncontrado = (codigo: string, detail: string) => problema(404, codigo, detail);

const sinSesion = () => problema(401, 'NO_AUTENTICADO', 'Falta el token de acceso');
const sinPermiso = () => prohibido('SIN_PERMISO', 'No tenés permiso para hacer esto');

/** El torneo como lo devuelve el contrato público: sin lo que solo necesita el mock y con el cupo al día. */
const sinDatosDelMock = ({
  ocupadasAparte: _o,
  cobroRechazado: _c,
  nominaMaxima: _n,
  ...publico
}: TorneoMock): TorneoDetalle => publico;

const torneoPublico = (t: TorneoMock): TorneoDetalle => ({
  ...sinDatosDelMock(t),
  cupoDisponible: cupoDisponible(t),
});

const buscarTorneo = (id: number) => TORNEOS.find((t) => t.id === id);
const buscarEquipo = (id: number) => estado.equipos.find((e) => e.id === id);
const buscarJugador = (id: number) => JUGADORES.find((j) => j.id === id);

const confirmadas = (torneoId: number) =>
  estado.inscripciones.filter((i) => i.torneoId === torneoId && i.estado === 'CONFIRMADA').length;
const cupoDisponible = (t: TorneoMock) =>
  Math.max(0, t.cupoMaximo - t.ocupadasAparte - confirmadas(t.id));

const abierto = (t: TorneoMock) =>
  t.estado === 'INSCRIPCION_ABIERTA' &&
  (t.cierreInscripcionEn === null || new Date(t.cierreInscripcionEn).getTime() > Date.now());

const usuarioPublico = (sesion: SesionMock, id: number): UsuarioPublico | undefined => {
  if (id === sesion.usuario.id) {
    return {
      id,
      username: sesion.usuario.username,
      nombres: sesion.persona.nombres ?? '',
      apellidos: sesion.persona.apellidos ?? '',
    };
  }
  const j = buscarJugador(id);
  return j && { id: j.id, username: j.username, nombres: j.nombres, apellidos: j.apellidos };
};

const equipoInscripto = (equipoId: number | null): EquipoInscripto | null => {
  const e = equipoId === null ? undefined : buscarEquipo(equipoId);
  return e ? { id: e.id, nombre: e.nombre } : null;
};

const torneoDeInscripcion = (torneoId: number): TorneoDeInscripcion => {
  const t = buscarTorneo(torneoId)!;
  return { id: t.id, nombre: t.nombre, slug: t.slug };
};

const resumen = (i: InscripcionMock) => ({
  id: i.id,
  torneoId: i.torneoId,
  torneo: torneoDeInscripcion(i.torneoId),
  usuarioId: i.usuarioId,
  estado: i.estado,
  creadoEn: i.creadoEn,
  modificadoEn: i.modificadoEn,
  equipo: equipoInscripto(i.equipoId),
});

const detalle = (sesion: SesionMock, i: InscripcionMock): InscripcionDetalle => ({
  ...resumen(i),
  reglamentoAceptadoEn: i.reglamentoAceptadoEn,
  nomina: i.nomina && i.nomina.map((id) => usuarioPublico(sesion, id)!),
});

const cambiar = (i: InscripcionMock, cambios: Partial<InscripcionMock>) => {
  Object.assign(i, cambios, { modificadoEn: ahora() });
};

// --- cuerpo de crear y editar -----------------------------------------------------------------

interface CuerpoEquipo {
  equipoId?: number;
  nombreEquipoNuevo?: string;
  nomina: number[];
}

const invalido = (campo: string, codigo: string, mensaje: string): ErrorCampo => ({
  campo,
  codigo,
  mensaje,
});

/** Mismas reglas de forma que el back: exactamente uno de equipoId y nombreEquipoNuevo. */
const validarCuerpoEquipo = (cuerpo: Cuerpo | null): CuerpoEquipo | ErrorCampo[] => {
  if (!cuerpo)
    return [invalido('equipoId', 'REQUERIDO', 'Falta el cuerpo con el equipo y la nómina')];
  const errores: ErrorCampo[] = [];
  const { equipoId, nombreEquipoNuevo, nomina } = cuerpo;
  const conId = equipoId !== undefined && equipoId !== null;
  const conNombre = nombreEquipoNuevo !== undefined && nombreEquipoNuevo !== null;
  if (conId === conNombre) {
    errores.push(
      invalido(
        'equipoId',
        'VALOR_INVALIDO',
        'Mandá exactamente uno de equipoId y nombreEquipoNuevo'
      )
    );
  }
  if (conId && !Number.isInteger(equipoId)) {
    errores.push(invalido('equipoId', 'FORMATO_INVALIDO', 'El equipo no es válido'));
  }
  if (conNombre) {
    const nombre = typeof nombreEquipoNuevo === 'string' ? nombreEquipoNuevo.trim() : '';
    if (!nombre)
      errores.push(invalido('nombreEquipoNuevo', 'REQUERIDO', 'El nombre es obligatorio'));
    else if (nombre.length > 100) {
      errores.push(invalido('nombreEquipoNuevo', 'LONGITUD', 'Hasta 100 caracteres'));
    }
  }
  if (nomina !== undefined && nomina !== null) {
    if (!Array.isArray(nomina) || nomina.some((n) => !Number.isInteger(n))) {
      errores.push(
        invalido('nomina', 'FORMATO_INVALIDO', 'La nómina tiene que ser una lista de ids')
      );
    }
  }
  if (errores.length) return errores;
  return {
    equipoId: conId ? (equipoId as number) : undefined,
    nombreEquipoNuevo: conNombre ? (nombreEquipoNuevo as string).trim() : undefined,
    nomina: Array.isArray(nomina) ? (nomina as number[]) : [],
  };
};

const leerCuerpo = async (request: Request): Promise<Cuerpo | null> => {
  const cuerpo = await request.json().catch(() => null);
  return cuerpo && typeof cuerpo === 'object' ? (cuerpo as Cuerpo) : null;
};

/** Los ids de la nómina con el capitán primero y sin repetidos. */
const nominaConCapitan = (capitanId: number, otros: number[]) => [
  capitanId,
  ...otros.filter((id, i) => id !== capitanId && otros.indexOf(id) === i),
];

/** Otra inscripción activa del torneo donde figura el jugador (el capitán incluido). */
const inscripcionActivaDe = (torneoId: number, jugadorId: number, exceptoId?: number) =>
  estado.inscripciones.find(
    (i) =>
      i.torneoId === torneoId &&
      i.id !== exceptoId &&
      esActiva(i) &&
      (i.usuarioId === jugadorId || Boolean(i.nomina?.includes(jugadorId)))
  );

// Reglas comunes de crear y de editar (el borrador no cuenta contra sí mismo).
const validarEquipoYNomina = (
  sesion: SesionMock,
  t: TorneoMock,
  cuerpo: CuerpoEquipo,
  exceptoId?: number
): Response | { equipoId: number | null; nomina: number[] } => {
  if (cuerpo.equipoId !== undefined) {
    const equipo = buscarEquipo(cuerpo.equipoId);
    if (!equipo || equipo.capitanId !== sesion.usuario.id) {
      return noEncontrado('EQUIPO_NO_ENCONTRADO', 'El equipo no existe o no es tuyo');
    }
  }
  const nomina = nominaConCapitan(sesion.usuario.id, cuerpo.nomina);
  if (nomina.some((id) => !usuarioPublico(sesion, id))) {
    return noEncontrado('USUARIO_NO_ENCONTRADO', 'Un jugador no existe');
  }
  if (!abierto(t)) {
    return conflicto('INSCRIPCION_NO_ABIERTA', 'La inscripción del torneo no está abierta');
  }
  if (
    sesion.usuario.estado !== 'ACTIVO' ||
    nomina.some((id) => buscarJugador(id)?.inactivoAlGuardar)
  ) {
    return conflicto('USUARIO_NO_ACTIVO', 'El capitán o un jugador no está activo');
  }
  if (
    cuerpo.equipoId !== undefined &&
    estado.inscripciones.some(
      (i) => i.torneoId === t.id && i.id !== exceptoId && i.equipoId === cuerpo.equipoId
    )
  ) {
    return conflicto('INSCRIPCION_DUPLICADA', 'El equipo ya tiene una inscripción en el torneo');
  }
  if (nomina.some((id) => inscripcionActivaDe(t.id, id, exceptoId))) {
    return conflicto('JUGADOR_YA_INSCRIPTO', 'Un jugador ya figura en otra inscripción del torneo');
  }
  if (nomina.some((id) => buscarJugador(id)?.bloqueado)) {
    return prohibido('USUARIO_BLOQUEADO', 'Un jugador tiene un bloqueo vigente');
  }
  // Recién acá se crea el equipo nuevo, para no dejar equipos sueltos si algo falla.
  let equipoId: number | null = cuerpo.equipoId ?? null;
  if (cuerpo.nombreEquipoNuevo !== undefined) {
    equipoId = estado.siguienteEquipo++;
    estado.equipos.push({
      id: equipoId,
      nombre: cuerpo.nombreEquipoNuevo,
      capitanId: sesion.usuario.id,
    });
  }
  return { equipoId, nomina };
};

// --- handlers ---------------------------------------------------------------------------------

/** `sesion` devuelve el usuario logueado de los mocks; la inscripción siempre sale de la sesión. */
export const crearInscripcionesHandlers = (sesion: () => SesionMock) => {
  const conSesion = (request: Request): SesionMock | null =>
    request.headers.get('Authorization')?.startsWith('Bearer ') ? sesion() : null;
  const puedeGestionar = (s: SesionMock) => s.permisos.includes(PERMISO);

  /** Una inscripción que es del usuario de la sesión, o el error que corresponde. */
  const propia = (s: SesionMock, id: number): InscripcionMock | Response => {
    const i = estado.inscripciones.find((x) => x.id === id && x.duenioId === s.usuario.id);
    return i ?? noEncontrado('INSCRIPCION_NO_ENCONTRADA', 'La inscripción no existe o no es tuya');
  };

  return [
    // Torneo por slug (público). Atiende solo los slugs de estos escenarios: con los demás devuelve
    // `undefined` y MSW sigue con el siguiente handler (torneoHandlers.ts).
    http.get(`${API_URL}/torneos/slug/:slug`, ({ params }) => {
      const t = TORNEOS.find((x) => x.slug === params.slug);
      return t ? HttpResponse.json(torneoPublico(t)) : undefined;
    }),

    // Buscar jugadores: cualquier usuario logueado, solo activos, sin datos personales.
    http.get(`${API_URL}/usuarios`, ({ request }) => {
      const s = conSesion(request);
      if (!s) return sinSesion();
      const url = new URL(request.url);
      const q = (url.searchParams.get('q') ?? '').trim();
      if (!q) return validacion([invalido('q', 'REQUERIDO', 'La búsqueda es obligatoria')]);
      if (q.length < 3)
        return validacion([invalido('q', 'LONGITUD', 'Escribí al menos 3 caracteres')]);
      const palabras = sinAcentos(q).split(/\s+/);
      const candidatos = [usuarioPublico(s, s.usuario.id)!, ...JUGADORES];
      const encontrados = candidatos
        .filter((u) => {
          const texto = sinAcentos(`${u.username} ${u.nombres} ${u.apellidos}`);
          return palabras.every((p) => texto.includes(p));
        })
        .sort((a, b) =>
          `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`, 'es')
        )
        .map(({ id, username, nombres, apellidos }) => ({ id, username, nombres, apellidos }));
      return pagina(encontrados, url);
    }),

    http.get(`${API_URL}/equipos/mios`, ({ request }) => {
      const s = conSesion(request);
      if (!s) return sinSesion();
      if (!puedeGestionar(s)) return sinPermiso();
      const propios = estado.equipos
        .filter((e) => e.capitanId === s.usuario.id)
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
        .map(({ id, nombre }) => ({ id, nombre }));
      return pagina(propios, new URL(request.url));
    }),

    http.get(`${API_URL}/inscripciones/mias`, ({ request }) => {
      const s = conSesion(request);
      if (!s) return sinSesion();
      const url = new URL(request.url);
      const torneoId = url.searchParams.get('torneoId');
      const propias = estado.inscripciones
        .filter(
          (i) => i.duenioId === s.usuario.id && (!torneoId || i.torneoId === Number(torneoId))
        )
        .sort((a, b) => b.id - a.id)
        .map(resumen);
      return pagina(propias, url);
    }),

    http.post(`${API_URL}/torneos/:id/inscripciones`, async ({ request, params }) => {
      const s = conSesion(request);
      if (!s) return sinSesion();
      if (!puedeGestionar(s)) return sinPermiso();
      const t = buscarTorneo(idDe(params));
      if (!t)
        return noEncontrado('TORNEO_NO_ENCONTRADO', 'El torneo no existe o está dado de baja');
      const cuerpo = await leerCuerpo(request);

      let equipoId: number | null = null;
      let nomina: number[] | null = null;
      if (t.tipoParticipante === 'INDIVIDUAL') {
        if (cuerpo) {
          return validacion([
            invalido('equipoId', 'VALOR_INVALIDO', 'Un torneo individual no lleva cuerpo'),
          ]);
        }
        if (!abierto(t)) {
          return conflicto('INSCRIPCION_NO_ABIERTA', 'La inscripción del torneo no está abierta');
        }
        if (s.usuario.estado !== 'ACTIVO') {
          return conflicto('USUARIO_NO_ACTIVO', 'El usuario no está activo');
        }
        if (inscripcionActivaDe(t.id, s.usuario.id)) {
          return conflicto('INSCRIPCION_DUPLICADA', 'Ya tenés una inscripción activa en el torneo');
        }
      } else {
        const valido = validarCuerpoEquipo(cuerpo);
        if (Array.isArray(valido)) return validacion(valido);
        const resultado = validarEquipoYNomina(s, t, valido);
        if (resultado instanceof Response) return resultado;
        ({ equipoId, nomina } = resultado);
      }

      const creada: InscripcionMock = {
        id: estado.siguienteInscripcion++,
        torneoId: t.id,
        duenioId: s.usuario.id,
        usuarioId: t.tipoParticipante === 'INDIVIDUAL' ? s.usuario.id : null,
        equipoId,
        nomina,
        estado: 'BORRADOR',
        reglamentoAceptadoEn: null,
        creadoEn: ahora(),
        modificadoEn: ahora(),
      };
      estado.inscripciones.push(creada);
      return HttpResponse.json(detalle(s, creada), {
        status: 201,
        headers: { Location: `${API_URL}/inscripciones/${creada.id}` },
      });
    }),

    // Ver alcanza con estar logueado: la ven el dueño y los jugadores de la nómina.
    http.get(`${API_URL}/inscripciones/:id`, ({ request, params }) => {
      const s = conSesion(request);
      if (!s) return sinSesion();
      const i = estado.inscripciones.find(
        (x) =>
          x.id === idDe(params) && (x.duenioId === s.usuario.id || x.nomina?.includes(s.usuario.id))
      );
      return i
        ? HttpResponse.json(detalle(s, i))
        : noEncontrado('INSCRIPCION_NO_ENCONTRADA', 'La inscripción no existe o no es tuya');
    }),

    // El historial lo ven el capitán, los jugadores de la nómina y el organizador del torneo, del más
    // viejo al más nuevo.
    http.get(`${API_URL}/inscripciones/:id/reemplazos`, ({ request, params }) => {
      const s = conSesion(request);
      if (!s) return sinSesion();
      const i = estado.inscripciones.find(
        (x) =>
          x.id === idDe(params) &&
          (x.duenioId === s.usuario.id ||
            x.nomina?.includes(s.usuario.id) ||
            buscarTorneo(x.torneoId)!.organizador.id === s.usuario.id)
      );
      if (!i)
        return noEncontrado('INSCRIPCION_NO_ENCONTRADA', 'La inscripción no existe o no es tuya');
      return HttpResponse.json(
        estado.reemplazos
          .filter((r) => r.inscripcionId === i.id)
          .sort((a, b) => a.reemplazadoEn.localeCompare(b.reemplazadoEn))
          .map((r) => ({
            sale: usuarioPublico(s, r.saleId),
            entra: usuarioPublico(s, r.entraId),
            reemplazadoEn: r.reemplazadoEn,
            realizadoPor: usuarioPublico(s, r.realizadoPorId),
          }))
      );
    }),

    // Reemplazo: solo el capitán y solo en una CONFIRMADA de equipo. Sale uno de la nómina (nunca el
    // capitán) y entra otro que no esté en ella ni en otra inscripción activa del torneo.
    http.post(`${API_URL}/inscripciones/:id/reemplazos`, async ({ request, params }) => {
      const s = conSesion(request);
      if (!s) return sinSesion();
      if (!puedeGestionar(s)) return sinPermiso();
      const cuerpo = await leerCuerpo(request);
      const sale = cuerpo?.saleUsuarioId;
      const entra = cuerpo?.entraUsuarioId;
      if (!Number.isInteger(sale) || !Number.isInteger(entra) || sale === entra) {
        return validacion([
          invalido(
            'entraUsuarioId',
            'INVALIDO',
            'Hay que indicar quién sale y quién entra, y ser distintos'
          ),
        ]);
      }
      const i = propia(s, idDe(params));
      if (i instanceof Response) return i;
      if (!i.nomina) {
        return conflicto('REEMPLAZO_INVALIDO', 'Una inscripción individual no tiene nómina');
      }
      if (i.estado !== 'CONFIRMADA') {
        return conflicto(
          'INSCRIPCION_NO_EDITABLE',
          'Solo se reemplaza en una inscripción confirmada'
        );
      }
      // Con el cupo completo la lista queda fija, aunque el torneo siga en INSCRIPCION_ABIERTA.
      const t = buscarTorneo(i.torneoId)!;
      if (!abierto(t) || cupoDisponible(t) === 0) {
        return conflicto('INSCRIPCION_NO_ABIERTA', 'La inscripción del torneo ya cerró');
      }
      if (!usuarioPublico(s, entra as number)) {
        return noEncontrado('USUARIO_NO_ENCONTRADO', 'El jugador que entra no existe');
      }
      if (
        sale === i.duenioId ||
        !i.nomina.includes(sale as number) ||
        i.nomina.includes(entra as number)
      ) {
        return conflicto('REEMPLAZO_INVALIDO', 'El jugador no se puede reemplazar en esta nómina');
      }
      if (inscripcionActivaDe(i.torneoId, entra as number, i.id)) {
        return conflicto(
          'JUGADOR_YA_INSCRIPTO',
          'El jugador ya figura en otra inscripción del torneo'
        );
      }
      if (buscarJugador(entra as number)?.bloqueado) {
        return prohibido('USUARIO_BLOQUEADO', 'El jugador que entra tiene un bloqueo vigente');
      }
      if (buscarJugador(entra as number)?.inactivoAlGuardar) {
        return conflicto('USUARIO_NO_ACTIVO', 'El jugador que entra no está activo');
      }
      cambiar(i, { nomina: i.nomina.map((id) => (id === sale ? (entra as number) : id)) });
      estado.reemplazos.push({
        inscripcionId: i.id,
        saleId: sale as number,
        entraId: entra as number,
        reemplazadoEn: ahora(),
        realizadoPorId: s.usuario.id,
      });
      return HttpResponse.json(detalle(s, i));
    }),

    http.put(`${API_URL}/inscripciones/:id`, async ({ request, params }) => {
      const s = conSesion(request);
      if (!s) return sinSesion();
      if (!puedeGestionar(s)) return sinPermiso();
      const i = propia(s, idDe(params));
      if (i instanceof Response) return i;
      const t = buscarTorneo(i.torneoId)!;
      if (t.tipoParticipante === 'INDIVIDUAL') {
        return validacion([
          invalido('equipoId', 'VALOR_INVALIDO', 'Una inscripción individual no tiene equipo'),
        ]);
      }
      const valido = validarCuerpoEquipo(await leerCuerpo(request));
      if (Array.isArray(valido)) return validacion(valido);
      if (i.estado !== 'BORRADOR') {
        return conflicto('INSCRIPCION_NO_EDITABLE', 'Solo se edita un borrador');
      }
      const resultado = validarEquipoYNomina(s, t, valido, i.id);
      if (resultado instanceof Response) return resultado;
      cambiar(i, resultado);
      return HttpResponse.json(detalle(s, i));
    }),

    http.delete(`${API_URL}/inscripciones/:id`, ({ request, params }) => {
      const s = conSesion(request);
      if (!s) return sinSesion();
      if (!puedeGestionar(s)) return sinPermiso();
      const i = propia(s, idDe(params));
      if (i instanceof Response) return i;
      if (i.estado !== 'BORRADOR' && i.estado !== 'PENDIENTE_PAGO') {
        return conflicto('INSCRIPCION_NO_EDITABLE', 'Solo se cancela en BORRADOR o PENDIENTE_PAGO');
      }
      cambiar(i, { estado: 'CANCELADA' });
      return new HttpResponse(null, { status: 204 });
    }),

    http.put(`${API_URL}/inscripciones/:id/confirmar`, async ({ request, params }) => {
      const s = conSesion(request);
      if (!s) return sinSesion();
      if (!puedeGestionar(s)) return sinPermiso();
      const i = propia(s, idDe(params));
      if (i instanceof Response) return i;
      const t = buscarTorneo(i.torneoId)!;
      const cuerpo = await leerCuerpo(request);
      if (i.estado !== 'BORRADOR') {
        return conflicto('INSCRIPCION_NO_EDITABLE', 'Solo se confirma un borrador');
      }
      if (cuerpo?.reglamentoAceptado !== true) {
        return conflicto('REGLAMENTO_NO_ACEPTADO', 'Hay que aceptar el reglamento');
      }
      if (!abierto(t)) {
        return conflicto('INSCRIPCION_NO_ABIERTA', 'La inscripción del torneo no está abierta');
      }
      if (
        s.usuario.estado !== 'ACTIVO' ||
        i.nomina?.some((id) => buscarJugador(id)?.inactivoAlGuardar)
      ) {
        return conflicto('USUARIO_NO_ACTIVO', 'El capitán o un jugador no está activo');
      }
      if (i.usuarioId !== null && inscripcionActivaDe(t.id, i.usuarioId, i.id)) {
        return conflicto('INSCRIPCION_DUPLICADA', 'Ya tenés una inscripción activa en el torneo');
      }
      if (i.nomina) {
        const desde = t.tamanioEquipo ?? 0;
        const hasta = t.nominaMaxima ?? Infinity;
        if (
          i.nomina.length < desde ||
          i.nomina.length > hasta ||
          !i.nomina.includes(s.usuario.id)
        ) {
          return conflicto(
            'NOMINA_INVALIDA',
            `La nómina tiene que tener de ${desde} a ${hasta} jugadores`
          );
        }
        if (i.nomina.some((id) => inscripcionActivaDe(t.id, id, i.id))) {
          return conflicto(
            'JUGADOR_YA_INSCRIPTO',
            'Un jugador ya figura en otra inscripción del torneo'
          );
        }
        if (i.nomina.some((id) => buscarJugador(id)?.bloqueado)) {
          return prohibido('USUARIO_BLOQUEADO', 'Un jugador tiene un bloqueo vigente');
        }
      }
      const gratis = t.valorInscripcion === 0;
      // Con costo es un aviso temprano que acá no se simula: el cupo se chequea en firme al pagar.
      if (gratis && cupoDisponible(t) === 0) {
        return conflicto('CUPO_COMPLETO', 'Las inscripciones confirmadas ya completan el cupo');
      }
      cambiar(i, {
        estado: gratis ? 'CONFIRMADA' : 'PENDIENTE_PAGO',
        reglamentoAceptadoEn: ahora(),
      });
      return HttpResponse.json(detalle(s, i));
    }),

    http.put(`${API_URL}/inscripciones/:id/reabrir`, ({ request, params }) => {
      const s = conSesion(request);
      if (!s) return sinSesion();
      if (!puedeGestionar(s)) return sinPermiso();
      const i = propia(s, idDe(params));
      if (i instanceof Response) return i;
      if (i.estado !== 'PENDIENTE_PAGO') {
        return conflicto(
          'INSCRIPCION_NO_EDITABLE',
          'Solo se reabre una inscripción pendiente de pago'
        );
      }
      cambiar(i, { estado: 'BORRADOR', reglamentoAceptadoEn: null });
      return HttpResponse.json(detalle(s, i));
    }),

    http.get(`${API_URL}/inscripciones/:id/resumen-pago`, ({ request, params }) => {
      const s = conSesion(request);
      if (!s) return sinSesion();
      if (!puedeGestionar(s)) return sinPermiso();
      const i = propia(s, idDe(params));
      if (i instanceof Response) return i;
      if (i.estado !== 'PENDIENTE_PAGO') {
        return conflicto(
          'INSCRIPCION_NO_EDITABLE',
          'Solo hay resumen de pago si está pendiente de pago'
        );
      }
      const t = buscarTorneo(i.torneoId)!;
      return HttpResponse.json({
        inscripcionId: i.id,
        torneo: { id: t.id, nombre: t.nombre },
        participante: i.usuarioId === null ? null : usuarioPublico(s, i.usuarioId),
        equipo: equipoInscripto(i.equipoId),
        monto: t.valorInscripcion,
        // como el back: el % que el torneo selló al publicar, sobre el valor
        gastosAdministrativos: (t.valorInscripcion * (t.pctGastosAdministrativos ?? 0)) / 100,
        total: t.valorInscripcion * (1 + (t.pctGastosAdministrativos ?? 0) / 100),
        moneda: t.moneda,
        cupoMaximo: t.cupoMaximo,
        cupoDisponible: cupoDisponible(t),
        cierreInscripcionEn: t.cierreInscripcionEn,
      });
    }),

    http.post(`${API_URL}/inscripciones/:id/pago`, ({ request, params }) => {
      const s = conSesion(request);
      if (!s) return sinSesion();
      if (!puedeGestionar(s)) return sinPermiso();
      const i = propia(s, idDe(params));
      if (i instanceof Response) return i;
      // Reintentar el pago de una ya confirmada responde 200 sin cobrar de nuevo.
      if (i.estado === 'CONFIRMADA') return HttpResponse.json(detalle(s, i));
      if (i.estado !== 'PENDIENTE_PAGO') {
        return conflicto(
          'INSCRIPCION_NO_EDITABLE',
          'Solo se paga una inscripción pendiente de pago'
        );
      }
      const t = buscarTorneo(i.torneoId)!;
      if (!abierto(t)) {
        return conflicto('INSCRIPCION_NO_ABIERTA', 'La inscripción del torneo no está abierta');
      }
      if (s.usuario.estado !== 'ACTIVO') {
        return conflicto('USUARIO_NO_ACTIVO', 'El usuario no está activo');
      }
      if (cupoDisponible(t) === 0) {
        return conflicto('CUPO_COMPLETO', 'No queda lugar en el cupo: no se cobró nada');
      }
      if (t.cobroRechazado) {
        return conflicto('COBRO_RECHAZADO', 'El pago no se aprobó y no se cobró nada');
      }
      cambiar(i, { estado: 'CONFIRMADA' });
      return HttpResponse.json(detalle(s, i));
    }),
  ];
};
