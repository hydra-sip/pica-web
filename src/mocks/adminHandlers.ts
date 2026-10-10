import { http, HttpResponse } from 'msw';

// Backoffice en memoria: usuarios, personas, roles y permisos con las formas, reglas y códigos de
// pica-back/docs/api/openapi.yaml. Sirve para mostrar las pantallas sin el back; se reinicia al
// recargar la página. Con VITE_ENABLE_MOCKS=false todo va al back real.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

type Estado = 'ACTIVO' | 'INACTIVO';
type EstadoUsuario = 'PENDIENTE_VERIFICACION' | 'ACTIVO' | 'BLOQUEADO';
type Cuerpo = Record<string, unknown>;

interface PersonaMock {
  id: number;
  nombres: string;
  apellidos: string;
  tipoDoc: string | null;
  nroDoc: string | null;
  fechaNacimiento: string | null;
  domicilioPostal: string | null;
  telefono: string | null;
  descripcion: string | null;
  estado: Estado;
  eliminadoEn: string | null;
  creadoEn: string;
  modificadoEn: string | null;
}

interface UsuarioMock {
  id: number;
  username: string;
  email: string;
  descripcion: string | null;
  estado: EstadoUsuario;
  emailVerificado: boolean;
  eliminadoEn: string | null;
  protegido: boolean;
  personaId: number;
  roles: number[];
  creadoEn: string;
  modificadoEn: string | null;
}

interface RolMock {
  id: number;
  nombre: string;
  nombreAmigable: string;
  descripcion: string | null;
  estado: Estado;
  esSistema: boolean;
  eliminadoEn: string | null;
  permisos: string[];
  creadoEn: string;
  modificadoEn: string | null;
}

// Seed de V4
const CATALOGO = [
  {
    modulo: 'USUARIOS',
    permisos: [
      { codigo: 'USUARIO_VER', descripcion: 'Ver el listado y el detalle de usuarios' },
      { codigo: 'USUARIO_CREAR', descripcion: 'Dar de alta usuarios' },
      {
        codigo: 'USUARIO_EDITAR',
        descripcion: 'Modificar usuarios, bloquearlos y resetear su contraseña',
      },
      { codigo: 'USUARIO_ELIMINAR', descripcion: 'Dar de baja y reactivar usuarios' },
    ],
  },
  {
    modulo: 'PERSONAS',
    permisos: [
      { codigo: 'PERSONA_VER', descripcion: 'Ver el listado y el detalle de personas' },
      { codigo: 'PERSONA_CREAR', descripcion: 'Dar de alta personas' },
      { codigo: 'PERSONA_EDITAR', descripcion: 'Modificar datos de personas' },
      { codigo: 'PERSONA_ELIMINAR', descripcion: 'Dar de baja y reactivar personas' },
    ],
  },
  {
    modulo: 'ROLES',
    permisos: [
      { codigo: 'ROL_VER', descripcion: 'Ver roles y el catálogo de permisos' },
      { codigo: 'ROL_CREAR', descripcion: 'Crear roles' },
      { codigo: 'ROL_EDITAR', descripcion: 'Modificar roles y sus permisos' },
      { codigo: 'ROL_ELIMINAR', descripcion: 'Dar de baja y reactivar roles' },
      { codigo: 'ROL_ASIGNAR', descripcion: 'Asignar y quitar roles a usuarios' },
    ],
  },
];
const TODOS_LOS_PERMISOS = CATALOGO.flatMap((m) => m.permisos.map((p) => p.codigo));

const SUPER_USUARIO = 1;
const PARTICIPANTE = 6;
const ALTA = '2026-09-19T12:00:00Z';

const ahora = () => new Date().toISOString();

// Seed de V2 + V4 (mismos ids y permisos que el back)
const rol = (
  id: number,
  nombre: string,
  nombreAmigable: string,
  permisos: string[] = []
): RolMock => ({
  id,
  nombre,
  nombreAmigable,
  descripcion: null,
  estado: 'ACTIVO',
  esSistema: id === SUPER_USUARIO,
  eliminadoEn: null,
  permisos,
  creadoEn: ALTA,
  modificadoEn: null,
});

const roles: RolMock[] = [
  rol(1, 'SUPER_USUARIO', 'Super Usuario', TODOS_LOS_PERMISOS),
  rol(
    2,
    'ADMINISTRADOR',
    'Administrador',
    TODOS_LOS_PERMISOS.filter((p) => !['ROL_CREAR', 'ROL_EDITAR', 'ROL_ELIMINAR'].includes(p))
  ),
  rol(3, 'ORGANIZADOR', 'Organizador'),
  rol(4, 'ARBITRO', 'Árbitro'),
  rol(5, 'SOPORTE', 'Soporte'),
  rol(6, 'PARTICIPANTE', 'Participante'),
];

const persona = (
  id: number,
  nombres: string,
  apellidos: string,
  tipoDoc: string,
  nroDoc: string,
  extra: Partial<PersonaMock> = {}
): PersonaMock => ({
  id,
  nombres,
  apellidos,
  tipoDoc,
  nroDoc,
  fechaNacimiento: null,
  domicilioPostal: null,
  telefono: null,
  descripcion: null,
  estado: 'ACTIVO',
  eliminadoEn: null,
  creadoEn: ALTA,
  modificadoEn: null,
  ...extra,
});

const personas: PersonaMock[] = [
  persona(1, 'Administrador', 'PICA', 'DNI', '30111222'),
  persona(2, 'Juan', 'Pérez', 'DNI', '30123456', {
    fechaNacimiento: '1990-05-17',
    domicilioPostal: 'Av. Constitución 1234, Luján',
    telefono: '1122334455',
  }),
  persona(3, 'María', 'García', 'DNI', '32456789', { telefono: '1133445566' }),
  persona(4, 'Lucas', 'Fernández', 'DNI', '35111333'),
  persona(5, 'Carla', 'Gómez', 'DNI', '28999111', { descripcion: 'Secretaría del club' }),
  persona(6, 'Ana', 'Torres', 'DNI', '33444555'),
  persona(7, 'Sofía', 'Martínez', 'DNI', '40222333', { fechaNacimiento: '1998-11-02' }),
  persona(8, 'Diego', 'López', 'PASAPORTE', 'AB123456'),
  persona(9, 'Pedro', 'Ruiz', 'DNI', '31555666', { eliminadoEn: '2026-09-22T15:00:00Z' }),
];

const usuario = (
  id: number,
  username: string,
  email: string,
  personaId: number,
  rolesIds: number[],
  extra: Partial<UsuarioMock> = {}
): UsuarioMock => ({
  id,
  username,
  email,
  descripcion: null,
  estado: 'ACTIVO',
  emailVerificado: true,
  eliminadoEn: null,
  protegido: false,
  personaId,
  roles: rolesIds,
  creadoEn: ALTA,
  modificadoEn: null,
  ...extra,
});

const usuarios: UsuarioMock[] = [
  usuario(1, 'admin', 'admin@pica.edu.ar', 1, [SUPER_USUARIO], { protegido: true }),
  usuario(2, 'jperez', 'juan.perez@example.com', 2, [PARTICIPANTE], {
    creadoEn: '2026-09-20T10:00:00Z',
  }),
  usuario(3, 'mgarcia', 'maria.garcia@example.com', 3, [PARTICIPANTE], {
    estado: 'PENDIENTE_VERIFICACION',
    emailVerificado: false,
    creadoEn: '2026-09-21T10:00:00Z',
  }),
  usuario(4, 'lfernandez', 'lucas.fernandez@example.com', 4, [PARTICIPANTE], {
    estado: 'BLOQUEADO',
    creadoEn: '2026-09-21T11:00:00Z',
  }),
  usuario(5, 'cgomez', 'carla.gomez@example.com', 5, [2], {
    descripcion: 'Carga los jugadores del club',
    creadoEn: '2026-09-22T09:00:00Z',
  }),
  usuario(6, 'atorres', 'ana.torres@example.com', 6, [PARTICIPANTE], {
    eliminadoEn: '2026-09-23T18:00:00Z',
    creadoEn: '2026-09-22T12:00:00Z',
  }),
];

const siguienteId = (lista: { id: number }[]) => Math.max(0, ...lista.map((x) => x.id)) + 1;

// --- respuestas -------------------------------------------------------------------------------

const TITULOS: Record<number, string> = {
  400: 'Bad Request',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
};

const problema = (status: number, codigo: string, detail: string, extra: Cuerpo = {}) =>
  HttpResponse.json(
    { type: 'about:blank', title: TITULOS[status], status, detail, codigo, ...extra },
    { status, headers: { 'Content-Type': 'application/problem+json' } }
  );

interface ErrorCampo {
  campo: string;
  codigo: string;
  mensaje: string;
}

const validacion = (errores: ErrorCampo[]) =>
  problema(400, 'VALIDACION', 'Hay campos inválidos', { errores });

const noEncontrado = (codigo: string, que: string) => problema(404, codigo, `${que} no existe`);

// --- validaciones (mismas anotaciones que los DTO del back) ----------------------------------

const texto = (v: unknown): string => (typeof v === 'string' ? v : '');
const textoONull = (v: unknown): string | null => (texto(v).trim() ? texto(v).trim() : null);

const DOC_NUMERICO = ['DNI', 'LC', 'LE'];
const TIPOS_DOC = [...DOC_NUMERICO, 'CI', 'PASAPORTE'];

const exigir = (errores: ErrorCampo[], campo: string, valor: unknown, max: number, min = 1) => {
  const v = texto(valor);
  if (!v.trim()) {
    errores.push({ campo, codigo: 'REQUERIDO', mensaje: 'Es obligatorio' });
    return false;
  }
  if (v.length < min || v.length > max) {
    errores.push({ campo, codigo: 'LONGITUD', mensaje: `Entre ${min} y ${max} caracteres` });
    return false;
  }
  return true;
};

const largoMaximo = (errores: ErrorCampo[], campo: string, valor: unknown, max: number) => {
  if (texto(valor).length > max) {
    errores.push({ campo, codigo: 'LONGITUD', mensaje: `Hasta ${max} caracteres` });
  }
};

const validarPassword = (errores: ErrorCampo[], campo: string, valor: unknown) => {
  const v = texto(valor);
  if (!v) {
    errores.push({ campo, codigo: 'REQUERIDO', mensaje: 'Es obligatorio' });
  } else if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(v) || new TextEncoder().encode(v).length > 72) {
    errores.push({
      campo,
      codigo: 'PASSWORD_DEBIL',
      mensaje: 'Mínimo 8, una mayúscula y un número',
    });
  }
};

const validarUsuario = (b: Cuerpo, conPassword: boolean): ErrorCampo[] => {
  const errores: ErrorCampo[] = [];
  if (
    exigir(errores, 'username', b.username, 30, 3) &&
    !/^[a-zA-Z0-9._-]+$/.test(texto(b.username))
  ) {
    errores.push({
      campo: 'username',
      codigo: 'FORMATO_INVALIDO',
      mensaje: 'Letras, números, punto, guión y guión bajo',
    });
  }
  if (
    exigir(errores, 'email', b.email, 254) &&
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(texto(b.email))
  ) {
    errores.push({ campo: 'email', codigo: 'FORMATO_INVALIDO', mensaje: 'No es un email válido' });
  }
  if (conPassword) validarPassword(errores, 'passwordTemporal', b.passwordTemporal);
  largoMaximo(errores, 'descripcion', b.descripcion, 500);
  if (
    b.estado !== undefined &&
    b.estado !== null &&
    !['ACTIVO', 'BLOQUEADO'].includes(texto(b.estado))
  ) {
    errores.push({ campo: 'estado', codigo: 'VALOR_INVALIDO', mensaje: 'ACTIVO o BLOQUEADO' });
  }
  if (typeof b.personaId !== 'number') {
    errores.push({ campo: 'personaId', codigo: 'REQUERIDO', mensaje: 'Es obligatorio' });
  }
  return errores;
};

const validarPersona = (b: Cuerpo): ErrorCampo[] => {
  const errores: ErrorCampo[] = [];
  exigir(errores, 'nombres', b.nombres, 100);
  exigir(errores, 'apellidos', b.apellidos, 100);
  const tipoDoc = texto(b.tipoDoc);
  if (!tipoDoc) {
    errores.push({ campo: 'tipoDoc', codigo: 'REQUERIDO', mensaje: 'Es obligatorio' });
  } else if (!TIPOS_DOC.includes(tipoDoc)) {
    errores.push({
      campo: 'tipoDoc',
      codigo: 'VALOR_INVALIDO',
      mensaje: 'Tipo de documento inválido',
    });
  }
  if (exigir(errores, 'nroDoc', b.nroDoc, 20, 5) && TIPOS_DOC.includes(tipoDoc)) {
    const nro = texto(b.nroDoc);
    const valido = DOC_NUMERICO.includes(tipoDoc)
      ? /^\d{7,8}$/.test(nro)
      : /^[0-9A-Za-z]+$/.test(nro) && /\d/.test(nro);
    if (!valido) {
      errores.push({
        campo: 'nroDoc',
        codigo: 'FORMATO_INVALIDO',
        mensaje: 'No coincide con el tipo de documento',
      });
    }
  }
  const fecha = texto(b.fechaNacimiento);
  if (fecha && fecha > ahora().slice(0, 10)) {
    errores.push({
      campo: 'fechaNacimiento',
      codigo: 'FECHA_FUTURA',
      mensaje: 'No puede ser futura',
    });
  }
  largoMaximo(errores, 'domicilioPostal', b.domicilioPostal, 200);
  largoMaximo(errores, 'telefono', b.telefono, 30);
  largoMaximo(errores, 'descripcion', b.descripcion, 500);
  if (
    b.estado !== undefined &&
    b.estado !== null &&
    !['ACTIVO', 'INACTIVO'].includes(texto(b.estado))
  ) {
    errores.push({ campo: 'estado', codigo: 'VALOR_INVALIDO', mensaje: 'ACTIVO o INACTIVO' });
  }
  return errores;
};

const validarRol = (b: Cuerpo): ErrorCampo[] => {
  const errores: ErrorCampo[] = [];
  if (!texto(b.nombre)) {
    errores.push({ campo: 'nombre', codigo: 'REQUERIDO', mensaje: 'Es obligatorio' });
  } else if (!/^[A-Z][A-Z0-9_]{2,49}$/.test(texto(b.nombre))) {
    errores.push({
      campo: 'nombre',
      codigo: 'FORMATO_INVALIDO',
      mensaje: 'Mayúsculas, números y guión bajo (ej. VEEDOR)',
    });
  }
  exigir(errores, 'nombreAmigable', b.nombreAmigable, 100);
  largoMaximo(errores, 'descripcion', b.descripcion, 500);
  if (
    b.estado !== undefined &&
    b.estado !== null &&
    !['ACTIVO', 'INACTIVO'].includes(texto(b.estado))
  ) {
    errores.push({ campo: 'estado', codigo: 'VALOR_INVALIDO', mensaje: 'ACTIVO o INACTIVO' });
  }
  return errores;
};

// --- vistas (schemas del contrato) ----------------------------------------------------------

const buscarPersona = (id: number) => personas.find((p) => p.id === id);
const buscarUsuario = (id: number) => usuarios.find((u) => u.id === id);
const buscarRol = (id: number) => roles.find((r) => r.id === id);

const rolMinimo = (id: number) => {
  const r = buscarRol(id)!;
  return { id: r.id, nombre: r.nombre, nombreAmigable: r.nombreAmigable };
};

const personaDatos = (p: PersonaMock) => ({
  id: p.id,
  nombres: p.nombres,
  apellidos: p.apellidos,
  tipoDoc: p.tipoDoc,
  nroDoc: p.nroDoc,
  fechaNacimiento: p.fechaNacimiento,
  domicilioPostal: p.domicilioPostal,
  telefono: p.telefono,
  descripcion: p.descripcion,
  estado: p.estado,
});

// Como el back: tieneUsuario cuenta también un usuario dado de baja (persona_id es único)
const usuarioDePersona = (personaId: number) => usuarios.find((u) => u.personaId === personaId);

const personaResumen = (p: PersonaMock) => ({
  id: p.id,
  nombres: p.nombres,
  apellidos: p.apellidos,
  tipoDoc: p.tipoDoc,
  nroDoc: p.nroDoc,
  estado: p.estado,
  eliminado: p.eliminadoEn !== null,
  tieneUsuario: usuarioDePersona(p.id) !== undefined,
});

const personaDetalle = (p: PersonaMock) => {
  const u = usuarioDePersona(p.id);
  return {
    ...personaDatos(p),
    eliminado: p.eliminadoEn !== null,
    eliminadoEn: p.eliminadoEn,
    creadoEn: p.creadoEn,
    modificadoEn: p.modificadoEn,
    usuario: u
      ? {
          id: u.id,
          username: u.username,
          email: u.email,
          estado: u.estado,
          eliminado: u.eliminadoEn !== null,
        }
      : null,
  };
};

const usuarioResumen = (u: UsuarioMock) => {
  const p = buscarPersona(u.personaId)!;
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    estado: u.estado,
    eliminado: u.eliminadoEn !== null,
    protegido: u.protegido,
    persona: {
      id: p.id,
      nombreCompleto: `${p.apellidos}, ${p.nombres}`,
      tipoDoc: p.tipoDoc,
      nroDoc: p.nroDoc,
    },
    roles: u.roles.map(rolMinimo),
    creadoEn: u.creadoEn,
  };
};

const usuarioDetalle = (u: UsuarioMock) => ({
  id: u.id,
  username: u.username,
  email: u.email,
  descripcion: u.descripcion,
  estado: u.estado,
  emailVerificado: u.emailVerificado,
  eliminado: u.eliminadoEn !== null,
  eliminadoEn: u.eliminadoEn,
  protegido: u.protegido,
  tieneContrasena: true,
  conGoogle: false,
  persona: personaDatos(buscarPersona(u.personaId)!),
  roles: u.roles.map(rolMinimo),
  creadoEn: u.creadoEn,
  modificadoEn: u.modificadoEn,
});

const rolResumen = (r: RolMock) => ({
  id: r.id,
  nombre: r.nombre,
  nombreAmigable: r.nombreAmigable,
  descripcion: r.descripcion,
  estado: r.estado,
  esSistema: r.esSistema,
  eliminado: r.eliminadoEn !== null,
  cantidadUsuarios: usuarios.filter((u) => u.eliminadoEn === null && u.roles.includes(r.id)).length,
});

const rolDetalle = (r: RolMock) => ({
  ...rolResumen(r),
  permisos: TODOS_LOS_PERMISOS.filter((p) => r.permisos.includes(p)),
  eliminadoEn: r.eliminadoEn,
  creadoEn: r.creadoEn,
  modificadoEn: r.modificadoEn,
});

// --- listados: filtros, orden y página como Spring ------------------------------------------

type Campo<T> = (item: T) => string | number;

const paginar = <T, R>(
  items: T[],
  url: URL,
  campos: Record<string, Campo<T>>,
  ordenPorDefecto: string[],
  vista: (item: T) => R
) => {
  const criterios = url.searchParams.getAll('sort');
  const orden = (criterios.length ? criterios : ordenPorDefecto)
    .map((c) => c.split(','))
    .filter(([campo]) => campos[campo.trim()])
    .map(([campo, dir]) => ({
      campo: campos[campo.trim()],
      desc: dir?.trim().toLowerCase() === 'desc',
    }));
  const ordenados = [...items].sort((a, b) => {
    for (const { campo, desc } of orden) {
      const va = campo(a);
      const vb = campo(b);
      const cmp =
        typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va).localeCompare(String(vb), 'es');
      if (cmp !== 0) return desc ? -cmp : cmp;
    }
    return 0;
  });
  const size = Math.min(Math.max(Number(url.searchParams.get('size') ?? 20) || 20, 1), 100);
  const number = Math.max(Number(url.searchParams.get('page') ?? 0) || 0, 0);
  return HttpResponse.json({
    content: ordenados.slice(number * size, (number + 1) * size).map(vista),
    page: { size, number, totalElements: items.length, totalPages: Math.ceil(items.length / size) },
  });
};

const contiene = (valor: string | null, q: string) => (valor ?? '').toLowerCase().includes(q);
const incluirEliminados = (url: URL) => url.searchParams.get('incluirEliminados') === 'true';

const idDe = (params: Record<string, unknown>) => Number(params.id);

export const adminHandlers = [
  // --- Admin: usuarios ---------------------------------------------------------------------

  http.get(`${API_URL}/admin/usuarios`, ({ request }) => {
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
    const estado = url.searchParams.get('estado');
    const rolId = url.searchParams.get('rol');
    if (estado && !['PENDIENTE_VERIFICACION', 'ACTIVO', 'BLOQUEADO'].includes(estado)) {
      return validacion([
        { campo: 'estado', codigo: 'VALOR_INVALIDO', mensaje: 'Estado inválido' },
      ]);
    }
    const filtrados = usuarios.filter((u) => {
      const p = buscarPersona(u.personaId)!;
      return (
        (incluirEliminados(url) || u.eliminadoEn === null) &&
        (!estado || u.estado === estado) &&
        (!rolId || u.roles.includes(Number(rolId))) &&
        (!q ||
          contiene(u.username, q) ||
          contiene(u.email, q) ||
          contiene(p.apellidos, q) ||
          contiene(p.nroDoc, q))
      );
    });
    // Como el back: un campo que no se puede ordenar se ignora
    return paginar(
      filtrados,
      url,
      {
        id: (u) => u.id,
        username: (u) => u.username,
        email: (u) => u.email,
        estado: (u) => u.estado,
        creadoEn: (u) => u.creadoEn,
        apellidos: (u) => buscarPersona(u.personaId)!.apellidos,
        nombres: (u) => buscarPersona(u.personaId)!.nombres,
      },
      ['creadoEn,desc'],
      usuarioResumen
    );
  }),

  http.post(`${API_URL}/admin/usuarios`, async ({ request }) => {
    const b = (await request.json().catch(() => ({}))) as Cuerpo;
    const errores = validarUsuario(b, true);
    if (errores.length) return validacion(errores);
    const username = texto(b.username);
    const email = texto(b.email);
    if (usuarios.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      return problema(409, 'USERNAME_DUPLICADO', `El username ${username} ya está en uso`);
    }
    if (usuarios.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return problema(409, 'EMAIL_DUPLICADO', `El email ${email} ya está en uso`);
    }
    const p = buscarPersona(Number(b.personaId));
    if (!p || p.eliminadoEn) return noEncontrado('PERSONA_NO_ENCONTRADA', 'La persona');
    if (p.estado === 'INACTIVO')
      return problema(409, 'PERSONA_INACTIVA', 'La persona está inactiva');
    if (usuarioDePersona(p.id))
      return problema(409, 'PERSONA_CON_USUARIO', 'La persona ya tiene un usuario');
    const rolesIds = [...new Set((Array.isArray(b.roles) ? b.roles : []).map(Number))];
    for (const id of rolesIds) {
      const r = buscarRol(id);
      if (!r || r.eliminadoEn) return noEncontrado('ROL_NO_ENCONTRADO', `El rol ${id}`);
      if (r.estado === 'INACTIVO')
        return problema(409, 'ROL_INACTIVO', `El rol ${r.nombre} está inactivo`);
    }
    const nuevo = usuario(siguienteId(usuarios), username, email, p.id, rolesIds, {
      descripcion: textoONull(b.descripcion),
      estado: b.estado === 'BLOQUEADO' ? 'BLOQUEADO' : 'ACTIVO',
      creadoEn: ahora(),
    });
    usuarios.push(nuevo);
    return HttpResponse.json(usuarioDetalle(nuevo), { status: 201 });
  }),

  http.get(`${API_URL}/admin/usuarios/:id`, ({ params }) => {
    const u = buscarUsuario(idDe(params));
    return u
      ? HttpResponse.json(usuarioDetalle(u))
      : noEncontrado('USUARIO_NO_ENCONTRADO', 'El usuario');
  }),

  http.put(`${API_URL}/admin/usuarios/:id`, async ({ params, request }) => {
    const u = buscarUsuario(idDe(params));
    if (!u || u.eliminadoEn) return noEncontrado('USUARIO_NO_ENCONTRADO', 'El usuario');
    if (u.protegido)
      return problema(
        403,
        'USUARIO_PROTEGIDO',
        'El usuario Admin del sistema no se puede modificar'
      );
    const b = (await request.json().catch(() => ({}))) as Cuerpo;
    const errores = validarUsuario(b, false);
    if (!b.estado)
      errores.push({ campo: 'estado', codigo: 'REQUERIDO', mensaje: 'Es obligatorio' });
    if (errores.length) return validacion(errores);
    if (b.estado === 'ACTIVO' && !u.emailVerificado) {
      return problema(
        409,
        'EMAIL_NO_VERIFICADO',
        `El email de ${u.username} todavía no fue verificado: no se lo puede pasar a ACTIVO`
      );
    }
    const username = texto(b.username);
    const email = texto(b.email);
    if (
      usuarios.some((x) => x.id !== u.id && x.username.toLowerCase() === username.toLowerCase())
    ) {
      return problema(409, 'USERNAME_DUPLICADO', `El username ${username} ya está en uso`);
    }
    const cambiaEmail = email.toLowerCase() !== u.email.toLowerCase();
    if (cambiaEmail && usuarios.some((x) => x.email.toLowerCase() === email.toLowerCase())) {
      return problema(409, 'EMAIL_DUPLICADO', `El email ${email} ya está en uso`);
    }
    const personaId = Number(b.personaId);
    if (personaId !== u.personaId) {
      const p = buscarPersona(personaId);
      if (!p || p.eliminadoEn) return noEncontrado('PERSONA_NO_ENCONTRADA', 'La persona');
      if (p.estado === 'INACTIVO')
        return problema(409, 'PERSONA_INACTIVA', 'La persona está inactiva');
      if (usuarioDePersona(p.id))
        return problema(409, 'PERSONA_CON_USUARIO', 'La persona ya tiene un usuario');
    }
    Object.assign(u, {
      username,
      email,
      descripcion: textoONull(b.descripcion),
      personaId,
      modificadoEn: ahora(),
    });
    if (cambiaEmail) u.emailVerificado = false;
    u.estado =
      b.estado === 'BLOQUEADO'
        ? 'BLOQUEADO'
        : u.emailVerificado
          ? 'ACTIVO'
          : 'PENDIENTE_VERIFICACION';
    return HttpResponse.json(usuarioDetalle(u));
  }),

  http.delete(`${API_URL}/admin/usuarios/:id`, ({ params }) => {
    const u = buscarUsuario(idDe(params));
    if (!u) return noEncontrado('USUARIO_NO_ENCONTRADO', 'El usuario');
    if (u.protegido)
      return problema(
        403,
        'USUARIO_PROTEGIDO',
        'El usuario Admin del sistema no se puede dar de baja'
      );
    if (!u.eliminadoEn) u.eliminadoEn = ahora();
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API_URL}/admin/usuarios/:id/reactivar`, ({ params }) => {
    const u = buscarUsuario(idDe(params));
    if (!u) return noEncontrado('USUARIO_NO_ENCONTRADO', 'El usuario');
    u.eliminadoEn = null;
    buscarPersona(u.personaId)!.eliminadoEn = null;
    return HttpResponse.json(usuarioDetalle(u));
  }),

  http.put(`${API_URL}/admin/usuarios/:id/password`, async ({ params, request }) => {
    const u = buscarUsuario(idDe(params));
    if (!u || u.eliminadoEn) return noEncontrado('USUARIO_NO_ENCONTRADO', 'El usuario');
    if (u.protegido)
      return problema(
        403,
        'USUARIO_PROTEGIDO',
        'Al Admin del sistema no se le cambia la clave desde acá'
      );
    const b = (await request.json().catch(() => ({}))) as Cuerpo;
    const errores: ErrorCampo[] = [];
    validarPassword(errores, 'password', b.password);
    if (errores.length) return validacion(errores);
    return new HttpResponse(null, { status: 204 });
  }),

  http.put(`${API_URL}/admin/usuarios/:id/roles`, async ({ params, request }) => {
    const u = buscarUsuario(idDe(params));
    if (!u || u.eliminadoEn) return noEncontrado('USUARIO_NO_ENCONTRADO', 'El usuario');
    const b = (await request.json().catch(() => ({}))) as Cuerpo;
    if (!Array.isArray(b.roles)) {
      return validacion([{ campo: 'roles', codigo: 'REQUERIDO', mensaje: 'Es obligatorio' }]);
    }
    const pedidos = [...new Set(b.roles.map(Number))];
    for (const id of pedidos) {
      const r = buscarRol(id);
      if (!r || r.eliminadoEn) return noEncontrado('ROL_NO_ENCONTRADO', `El rol ${id}`);
    }
    if (u.protegido && !pedidos.includes(SUPER_USUARIO)) {
      return problema(
        403,
        'USUARIO_PROTEGIDO',
        'Al Admin del sistema no se le puede quitar Super Usuario'
      );
    }
    if (u.estado !== 'ACTIVO') {
      return problema(
        409,
        'USUARIO_NO_ACTIVO',
        `${u.username} no está activo: no se le pueden cambiar los roles`
      );
    }
    const agregados = pedidos.filter((id) => !u.roles.includes(id));
    const inactivo = agregados.map((id) => buscarRol(id)!).find((r) => r.estado === 'INACTIVO');
    if (inactivo) return problema(409, 'ROL_INACTIVO', `El rol ${inactivo.nombre} está inactivo`);
    u.roles = pedidos;
    u.modificadoEn = ahora();
    return HttpResponse.json(usuarioDetalle(u));
  }),

  // --- Admin: personas ---------------------------------------------------------------------

  http.get(`${API_URL}/admin/personas`, ({ request }) => {
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
    const estado = url.searchParams.get('estado');
    const filtradas = personas.filter(
      (p) =>
        (incluirEliminados(url) || p.eliminadoEn === null) &&
        (!estado || p.estado === estado) &&
        (!q || contiene(p.apellidos, q) || contiene(p.nroDoc, q))
    );
    return paginar(
      filtradas,
      url,
      {
        id: (p) => p.id,
        nombres: (p) => p.nombres,
        apellidos: (p) => p.apellidos,
        nroDoc: (p) => p.nroDoc ?? '',
        estado: (p) => p.estado,
        creadoEn: (p) => p.creadoEn,
      },
      ['apellidos,asc', 'nombres,asc'],
      personaResumen
    );
  }),

  http.post(`${API_URL}/admin/personas`, async ({ request }) => {
    const b = (await request.json().catch(() => ({}))) as Cuerpo;
    const errores = validarPersona(b);
    if (errores.length) return validacion(errores);
    const tipoDoc = texto(b.tipoDoc);
    const nroDoc = texto(b.nroDoc).toUpperCase();
    if (personas.some((p) => p.tipoDoc === tipoDoc && p.nroDoc === nroDoc)) {
      return problema(409, 'DOCUMENTO_DUPLICADO', `Ya hay una persona con ${tipoDoc} ${nroDoc}`);
    }
    const nueva = persona(
      siguienteId(personas),
      texto(b.nombres).trim(),
      texto(b.apellidos).trim(),
      tipoDoc,
      nroDoc,
      {
        fechaNacimiento: textoONull(b.fechaNacimiento),
        domicilioPostal: textoONull(b.domicilioPostal),
        telefono: textoONull(b.telefono),
        descripcion: textoONull(b.descripcion),
        estado: b.estado === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO',
        creadoEn: ahora(),
      }
    );
    personas.push(nueva);
    return HttpResponse.json(personaDetalle(nueva), { status: 201 });
  }),

  http.get(`${API_URL}/admin/personas/:id`, ({ params }) => {
    const p = buscarPersona(idDe(params));
    return p
      ? HttpResponse.json(personaDetalle(p))
      : noEncontrado('PERSONA_NO_ENCONTRADA', 'La persona');
  }),

  http.put(`${API_URL}/admin/personas/:id`, async ({ params, request }) => {
    const p = buscarPersona(idDe(params));
    if (!p || p.eliminadoEn) return noEncontrado('PERSONA_NO_ENCONTRADA', 'La persona');
    const b = (await request.json().catch(() => ({}))) as Cuerpo;
    const errores = validarPersona(b);
    if (errores.length) return validacion(errores);
    const tipoDoc = texto(b.tipoDoc);
    const nroDoc = texto(b.nroDoc).toUpperCase();
    if (personas.some((x) => x.id !== p.id && x.tipoDoc === tipoDoc && x.nroDoc === nroDoc)) {
      return problema(409, 'DOCUMENTO_DUPLICADO', `Ya hay una persona con ${tipoDoc} ${nroDoc}`);
    }
    Object.assign(p, {
      nombres: texto(b.nombres).trim(),
      apellidos: texto(b.apellidos).trim(),
      tipoDoc,
      nroDoc,
      fechaNacimiento: textoONull(b.fechaNacimiento),
      domicilioPostal: textoONull(b.domicilioPostal),
      telefono: textoONull(b.telefono),
      descripcion: textoONull(b.descripcion),
      estado: b.estado === 'ACTIVO' || b.estado === 'INACTIVO' ? b.estado : p.estado,
      modificadoEn: ahora(),
    });
    return HttpResponse.json(personaDetalle(p));
  }),

  http.delete(`${API_URL}/admin/personas/:id`, ({ params }) => {
    const p = buscarPersona(idDe(params));
    if (!p) return noEncontrado('PERSONA_NO_ENCONTRADA', 'La persona');
    if (p.eliminadoEn) return new HttpResponse(null, { status: 204 });
    const u = usuarioDePersona(p.id);
    if (u && u.eliminadoEn === null) {
      return problema(
        409,
        'PERSONA_CON_USUARIO',
        `Tiene el usuario ${u.username}: primero hay que darlo de baja`
      );
    }
    p.eliminadoEn = ahora();
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API_URL}/admin/personas/:id/reactivar`, ({ params }) => {
    const p = buscarPersona(idDe(params));
    if (!p) return noEncontrado('PERSONA_NO_ENCONTRADA', 'La persona');
    p.eliminadoEn = null;
    return HttpResponse.json(personaDetalle(p));
  }),

  // --- Admin: roles y permisos -------------------------------------------------------------

  http.get(`${API_URL}/admin/roles`, ({ request }) => {
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
    const estado = url.searchParams.get('estado');
    const campos: Record<string, Campo<RolMock>> = {
      id: (r) => r.id,
      nombre: (r) => r.nombre,
      nombreAmigable: (r) => r.nombreAmigable,
      estado: (r) => r.estado,
      creadoEn: (r) => r.creadoEn,
    };
    // Como el back: ordenar por otro campo es 400
    const invalido = url.searchParams.getAll('sort').find((c) => !campos[c.split(',')[0].trim()]);
    if (invalido) {
      return validacion([
        {
          campo: 'sort',
          codigo: 'VALOR_INVALIDO',
          mensaje: `No se puede ordenar por ${invalido.split(',')[0]}`,
        },
      ]);
    }
    const filtrados = roles.filter(
      (r) =>
        (incluirEliminados(url) || r.eliminadoEn === null) &&
        (!estado || r.estado === estado) &&
        (!q || contiene(r.nombre, q) || contiene(r.nombreAmigable, q))
    );
    return paginar(filtrados, url, campos, ['id,asc'], rolResumen);
  }),

  http.post(`${API_URL}/admin/roles`, async ({ request }) => {
    const b = (await request.json().catch(() => ({}))) as Cuerpo;
    const errores = validarRol(b);
    if (errores.length) return validacion(errores);
    const nombre = texto(b.nombre);
    if (roles.some((r) => r.nombre === nombre))
      return problema(409, 'ROL_DUPLICADO', `Ya existe el rol ${nombre}`);
    const nuevo: RolMock = {
      ...rol(siguienteId(roles), nombre, texto(b.nombreAmigable).trim()),
      descripcion: textoONull(b.descripcion),
      estado: b.estado === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO',
      creadoEn: ahora(),
    };
    roles.push(nuevo);
    return HttpResponse.json(rolDetalle(nuevo), { status: 201 });
  }),

  http.get(`${API_URL}/admin/roles/:id`, ({ params }) => {
    const r = buscarRol(idDe(params));
    return r ? HttpResponse.json(rolDetalle(r)) : noEncontrado('ROL_NO_ENCONTRADO', 'El rol');
  }),

  http.put(`${API_URL}/admin/roles/:id`, async ({ params, request }) => {
    const r = buscarRol(idDe(params));
    if (!r || r.eliminadoEn) return noEncontrado('ROL_NO_ENCONTRADO', 'El rol');
    const b = (await request.json().catch(() => ({}))) as Cuerpo;
    const errores = validarRol(b);
    if (errores.length) return validacion(errores);
    const nombre = texto(b.nombre);
    const estado = b.estado === 'ACTIVO' || b.estado === 'INACTIVO' ? b.estado : r.estado;
    if (r.id === SUPER_USUARIO)
      return problema(403, 'ROL_PROTEGIDO', 'Super Usuario no se modifica');
    if (r.id === PARTICIPANTE && (nombre !== r.nombre || estado !== r.estado)) {
      return problema(
        403,
        'ROL_PROTEGIDO',
        'A PARTICIPANTE no se le cambia el nombre ni el estado'
      );
    }
    if (roles.some((x) => x.id !== r.id && x.nombre === nombre)) {
      return problema(409, 'ROL_DUPLICADO', `Ya existe el rol ${nombre}`);
    }
    Object.assign(r, {
      nombre,
      nombreAmigable: texto(b.nombreAmigable).trim(),
      descripcion: textoONull(b.descripcion),
      estado,
      modificadoEn: ahora(),
    });
    return HttpResponse.json(rolDetalle(r));
  }),

  http.delete(`${API_URL}/admin/roles/:id`, ({ params }) => {
    const r = buscarRol(idDe(params));
    if (!r || r.eliminadoEn) return noEncontrado('ROL_NO_ENCONTRADO', 'El rol');
    if (r.id === SUPER_USUARIO || r.id === PARTICIPANTE) {
      return problema(403, 'ROL_PROTEGIDO', `${r.nombre} no se puede dar de baja`);
    }
    r.eliminadoEn = ahora();
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API_URL}/admin/roles/:id/reactivar`, ({ params }) => {
    const r = buscarRol(idDe(params));
    if (!r) return noEncontrado('ROL_NO_ENCONTRADO', 'El rol');
    r.eliminadoEn = null;
    return HttpResponse.json(rolDetalle(r));
  }),

  http.put(`${API_URL}/admin/roles/:id/permisos`, async ({ params, request }) => {
    const r = buscarRol(idDe(params));
    if (!r || r.eliminadoEn) return noEncontrado('ROL_NO_ENCONTRADO', 'El rol');
    if (r.id === SUPER_USUARIO)
      return problema(403, 'ROL_PROTEGIDO', 'A Super Usuario no se le cambian los permisos');
    const b = (await request.json().catch(() => ({}))) as Cuerpo;
    if (!Array.isArray(b.permisos)) {
      return validacion([{ campo: 'permisos', codigo: 'REQUERIDO', mensaje: 'Es obligatorio' }]);
    }
    const pedidos = [...new Set(b.permisos.map(String))];
    const invalidos = pedidos.filter((p) => !TODOS_LOS_PERMISOS.includes(p));
    if (invalidos.length) {
      return problema(404, 'PERMISO_NO_ENCONTRADO', 'Hay permisos que no existen', { invalidos });
    }
    if (r.estado === 'INACTIVO')
      return problema(409, 'ROL_INACTIVO', `El rol ${r.nombre} está inactivo`);
    r.permisos = pedidos;
    r.modificadoEn = ahora();
    return HttpResponse.json(rolDetalle(r));
  }),

  http.get(`${API_URL}/admin/permisos`, () => HttpResponse.json(CATALOGO)),
];
