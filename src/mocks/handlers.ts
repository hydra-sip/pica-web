import { http, HttpResponse } from 'msw';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

// In-memory mock store for current user profile state according to openapi.yaml
let mockCurrentUserState = {
  usuario: {
    id: 1,
    username: 'admin',
    email: 'admin@pica.edu.ar',
    estado: 'ACTIVO',
    tieneContrasena: true,
  },
  persona: {
    nombres: 'Administrador',
    apellidos: 'PICA',
    tipoDoc: 'DNI',
    nroDoc: '30111222',
    fechaNacimiento: '1990-01-01',
    domicilioPostal: 'Av. Constitución 1234, Luján',
    telefono: '1122334455',
  },
  roles: [
    { id: 1, nombre: 'ADMINISTRADOR', nombreAmigable: 'Administrador del Sistema' },
  ],
  permisos: ['USUARIO_VER', 'USUARIO_CREAR', 'PERSONA_VER', 'ROL_VER', 'ROL_ASIGNAR'],
  datosCompletos: true,
};

export const handlers = [
  // Auth: Registro Endpoint (POST /auth/registro) -> 201 { id }
  http.post(`${API_URL}/auth/registro`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      username?: string;
      email?: string;
      password?: string;
      nombres?: string;
      apellidos?: string;
    };

    if (body.username === 'duplicado') {
      return new HttpResponse(
        JSON.stringify({
          status: 409,
          codigo: 'USERNAME_DUPLICADO',
          detail: 'El nombre de usuario ya se encuentra registrado.',
        }),
        { status: 409, headers: { 'Content-Type': 'application/problem+json' } }
      );
    }

    if (body.email === 'existente@pica.edu.ar' || body.email === 'admin@pica.edu.ar') {
      return new HttpResponse(
        JSON.stringify({
          status: 409,
          codigo: 'EMAIL_DUPLICADO',
          detail: 'Este correo electrónico ya se encuentra registrado.',
        }),
        { status: 409, headers: { 'Content-Type': 'application/problem+json' } }
      );
    }

    if (body.username === 'invalido') {
      return new HttpResponse(
        JSON.stringify({
          status: 400,
          codigo: 'VALIDACION',
          detail: 'Error de validación en los datos ingresados.',
          errores: [{ campo: 'username', codigo: 'LONGITUD', mensaje: 'El nombre de usuario debe tener al menos 3 caracteres.' }],
        }),
        { status: 400, headers: { 'Content-Type': 'application/problem+json' } }
      );
    }

    return new HttpResponse(
      JSON.stringify({ id: Date.now() }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  }),

  // Auth: Verificar Correo Endpoint (GET /auth/verificar?token=) -> 204 No Content
  http.get(`${API_URL}/auth/verificar`, ({ request }) => {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token || token === 'expired-token' || token === 'invalid-token') {
      return new HttpResponse(
        JSON.stringify({
          status: 400,
          codigo: 'TOKEN_INVALIDO',
          detail: 'El enlace de verificación es inválido o ha expirado.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/problem+json' } }
      );
    }

    return new HttpResponse(null, { status: 204 });
  }),

  // Auth: Login Endpoint (POST /auth/login) -> { accessToken, refreshToken, tokenType, expiresIn }
  http.post(`${API_URL}/auth/login`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      identificador?: string;
      password?: string;
    };

    const id = body.identificador || '';

    if (id === 'noverificado@pica.edu.ar') {
      return new HttpResponse(
        JSON.stringify({
          status: 403,
          codigo: 'EMAIL_NO_VERIFICADO',
          detail: 'Tu cuenta aún no ha sido verificada. Revisá tu casilla de correo para activarla.',
        }),
        { status: 403, headers: { 'Content-Type': 'application/problem+json' } }
      );
    }

    if (id === 'bloqueado@pica.edu.ar') {
      return new HttpResponse(
        JSON.stringify({
          status: 403,
          codigo: 'USUARIO_BLOQUEADO',
          detail: 'Tu cuenta ha sido bloqueada. Por favor, contactá al administrador.',
        }),
        { status: 403, headers: { 'Content-Type': 'application/problem+json' } }
      );
    }

    if ((id === 'admin@pica.edu.ar' || id === 'admin') && body.password === 'admin123') {
      mockCurrentUserState = {
        usuario: { id: 1, username: 'admin', email: 'admin@pica.edu.ar', estado: 'ACTIVO', tieneContrasena: true },
        persona: { nombres: 'Administrador', apellidos: 'PICA', tipoDoc: 'DNI', nroDoc: '30111222', fechaNacimiento: '1990-01-01', domicilioPostal: 'Av. Constitución 1234, Luján', telefono: '1122334455' },
        roles: [{ id: 1, nombre: 'ADMINISTRADOR', nombreAmigable: 'Administrador del Sistema' }],
        permisos: ['USUARIO_VER', 'USUARIO_CREAR', 'PERSONA_VER', 'ROL_VER', 'ROL_ASIGNAR'],
        datosCompletos: true,
      };

      return HttpResponse.json({
        accessToken: 'mock-jwt-access-token-admin-12345',
        refreshToken: 'mock-jwt-refresh-token-admin-67890',
        tokenType: 'Bearer',
        expiresIn: 3600,
      });
    }

    if ((id === 'organizador@pica.edu.ar' || id === 'organizador') && body.password === 'org123') {
      mockCurrentUserState = {
        usuario: { id: 4, username: 'organizador', email: 'organizador@pica.edu.ar', estado: 'ACTIVO', tieneContrasena: true },
        persona: { nombres: 'Organizador', apellidos: 'Eventos', tipoDoc: 'DNI', nroDoc: '34555666', fechaNacimiento: '1987-03-20', domicilioPostal: 'Mitre 200, Luján', telefono: '1133221100' },
        roles: [{ id: 4, nombre: 'ORGANIZADOR', nombreAmigable: 'Organizador de Eventos' }],
        permisos: ['USUARIO_VER', 'PERSONA_VER'],
        datosCompletos: true,
      };

      return HttpResponse.json({
        accessToken: 'mock-jwt-access-token-organizador-12345',
        refreshToken: 'mock-jwt-refresh-token-organizador-67890',
        tokenType: 'Bearer',
        expiresIn: 3600,
      });
    }

    if ((id === 'user@pica.edu.ar' || id === 'usuario') && body.password === 'user123') {
      mockCurrentUserState = {
        usuario: { id: 2, username: 'usuario', email: 'user@pica.edu.ar', estado: 'ACTIVO', tieneContrasena: true },
        persona: { nombres: 'Usuario', apellidos: 'PICA', tipoDoc: 'DNI', nroDoc: '38123456', fechaNacimiento: '1995-05-15', domicilioPostal: 'San Martín 500, Luján', telefono: '1144556677' },
        roles: [{ id: 2, nombre: 'PARTICIPANTE', nombreAmigable: 'Participante Estándar' }],
        permisos: ['PERSONA_VER'],
        datosCompletos: true,
      };

      return HttpResponse.json({
        accessToken: 'mock-jwt-access-token-user-12345',
        refreshToken: 'mock-jwt-refresh-token-user-67890',
        tokenType: 'Bearer',
        expiresIn: 3600,
      });
    }

    if (id && body.password) {
      mockCurrentUserState = {
        usuario: { id: 3, username: id.split('@')[0], email: id.includes('@') ? id : `${id}@pica.edu.ar`, estado: 'ACTIVO', tieneContrasena: true },
        persona: { nombres: id.split('@')[0], apellidos: 'Usuario', tipoDoc: 'DNI', nroDoc: '', fechaNacimiento: '', domicilioPostal: '', telefono: '' },
        roles: [{ id: 2, nombre: 'PARTICIPANTE', nombreAmigable: 'Participante' }],
        permisos: ['PERSONA_VER'],
        datosCompletos: false,
      };

      return HttpResponse.json({
        accessToken: `mock-jwt-access-token-${Date.now()}`,
        refreshToken: `mock-jwt-refresh-token-${Date.now()}`,
        tokenType: 'Bearer',
        expiresIn: 3600,
      });
    }

    return new HttpResponse(
      JSON.stringify({
        status: 401,
        codigo: 'CREDENCIALES_INVALIDAS',
        detail: 'Usuario/email o contraseña incorrectos.',
      }),
      { status: 401, headers: { 'Content-Type': 'application/problem+json' } }
    );
  }),

  // Auth: OAuth2 Code Exchange (POST /auth/exchange)
  http.post(`${API_URL}/auth/exchange`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { code?: string };

    if (!body.code || body.code === 'invalid-code') {
      return new HttpResponse(
        JSON.stringify({
          status: 400,
          codigo: 'CODIGO_OAUTH_INVALIDO',
          detail: 'El código de autorización OAuth es inválido o ha expirado.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/problem+json' } }
      );
    }

    // Usuario Google que nace sin datos completos (requiere nroDoc, fechaNacimiento, domicilioPostal, telefono)
    mockCurrentUserState = {
      usuario: { id: 10, username: 'google_user', email: 'google.user@pica.edu.ar', estado: 'ACTIVO', tieneContrasena: false },
      persona: { nombres: 'Usuario Google', apellidos: 'PICA', tipoDoc: 'DNI', nroDoc: '', fechaNacimiento: '', domicilioPostal: '', telefono: '' },
      roles: [{ id: 2, nombre: 'PARTICIPANTE', nombreAmigable: 'Participante' }],
      permisos: ['PERSONA_VER'],
      datosCompletos: false,
    };

    return HttpResponse.json({
      accessToken: 'mock-oauth-access-token-google-888',
      refreshToken: 'mock-oauth-refresh-token-google-888',
      tokenType: 'Bearer',
      expiresIn: 3600,
    });
  }),

  // User Me Profile Endpoint (GET /me) -> OpenAPI User object
  http.get(`${API_URL}/me`, ({ request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new HttpResponse(
        JSON.stringify({
          status: 401,
          codigo: 'CREDENCIALES_INVALIDAS',
          detail: 'No autorizado. Token de acceso faltante.',
        }),
        { status: 401, headers: { 'Content-Type': 'application/problem+json' } }
      );
    }

    return HttpResponse.json(mockCurrentUserState);
  }),

  // User Persona Profile Update (PUT /me)
  http.put(`${API_URL}/me`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      nombres?: string;
      apellidos?: string;
      tipoDoc?: string;
      nroDoc?: string;
      fechaNacimiento?: string;
      domicilioPostal?: string;
      telefono?: string;
    };

    const newPersona = {
      ...mockCurrentUserState.persona,
      ...body,
    };

    const hasDoc = Boolean(newPersona.nroDoc && newPersona.nroDoc.trim().length > 0);
    const hasFecha = Boolean(newPersona.fechaNacimiento && newPersona.fechaNacimiento.trim().length > 0);
    const hasDom = Boolean(newPersona.domicilioPostal && newPersona.domicilioPostal.trim().length > 0);
    const hasTel = Boolean(newPersona.telefono && newPersona.telefono.trim().length > 0);

    mockCurrentUserState = {
      ...mockCurrentUserState,
      persona: newPersona,
      datosCompletos: hasDoc && hasFecha && hasDom && hasTel,
    };

    return HttpResponse.json(mockCurrentUserState);
  }),

  // Auth: Change Password (PUT /me/password según contrato OpenAPI)
  http.put(`${API_URL}/me/password`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      passwordActual?: string;
      passwordNueva?: string;
    };

    if (body.passwordActual === 'wrong') {
      return new HttpResponse(
        JSON.stringify({
          status: 400,
          codigo: 'PASSWORD_INCORRECTA',
          detail: 'La contraseña actual ingresada es incorrecta.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/problem+json' } }
      );
    }

    return HttpResponse.json({ message: 'Contraseña actualizada exitosamente' });
  }),

  // Auth: Refresh Token (POST /auth/refresh)
  http.post(`${API_URL}/auth/refresh`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { refreshToken?: string };

    if (!body.refreshToken || body.refreshToken === 'expired-token') {
      return new HttpResponse(
        JSON.stringify({
          status: 401,
          codigo: 'REFRESH_TOKEN_EXPIRED',
          detail: 'Refresh token expirado o inválido.',
        }),
        { status: 401, headers: { 'Content-Type': 'application/problem+json' } }
      );
    }

    return HttpResponse.json({
      accessToken: `mock-jwt-access-token-refreshed-${Date.now()}`,
      refreshToken: `mock-jwt-refresh-token-refreshed-${Date.now()}`,
      tokenType: 'Bearer',
      expiresIn: 3600,
    });
  }),

  // Auth: Logout (POST /auth/logout)
  http.post(`${API_URL}/auth/logout`, () => {
    return HttpResponse.json({ message: 'Sesión cerrada exitosamente' });
  }),

  // Admin Stats
  http.get(`${API_URL}/admin/stats`, () => {
    return HttpResponse.json({
      totalUsers: 24,
      activeProjects: 8,
      systemStatus: 'OPERATIVO',
      lastBackup: new Date().toISOString(),
    });
  }),

  // Admin User Roles Update (PUT /admin/usuarios/{id}/roles)
  http.put(`${API_URL}/admin/usuarios/:id/roles`, async ({ params, request }) => {
    const body = (await request.json().catch(() => ({}))) as { roles?: number[] };
    const { id } = params;

    if (id === '1') {
      return new HttpResponse(
        JSON.stringify({
          status: 403,
          codigo: 'USUARIO_PROTEGIDO',
          detail: 'No se pueden modificar los roles del Administrador principal.',
        }),
        { status: 403, headers: { 'Content-Type': 'application/problem+json' } }
      );
    }

    return HttpResponse.json({
      id: Number(id),
      roles: body.roles || [],
      message: 'Roles asignados correctamente.',
    });
  }),

  // Admin User Reset Password (PUT /admin/usuarios/{id}/password) -> 204
  http.put(`${API_URL}/admin/usuarios/:id/password`, async ({ params }) => {
    if (params.id === '1') {
      return HttpResponse.json(
        { status: 403, codigo: 'USUARIO_PROTEGIDO', detail: 'Al admin del sistema no se le puede cambiar la clave desde acá.' },
        { status: 403, headers: { 'Content-Type': 'application/problem+json' } }
      );
    }
    return new HttpResponse(null, { status: 204 });
  }),

  // Admin Role Permissions Update (PUT /admin/roles/{id}/permisos)
  http.put(`${API_URL}/admin/roles/:id/permisos`, async ({ params, request }) => {
    const body = (await request.json().catch(() => ({}))) as { permisos?: string[] };
    const { id } = params;

    if (id === '1') {
      return new HttpResponse(
        JSON.stringify({
          status: 403,
          codigo: 'ROL_PROTEGIDO',
          detail: 'No se pueden modificar los permisos del Super Usuario Administrador.',
        }),
        { status: 403, headers: { 'Content-Type': 'application/problem+json' } }
      );
    }

    return HttpResponse.json({
      id: Number(id),
      permisos: body.permisos || [],
      message: 'Permisos del rol actualizados exitosamente.',
    });
  }),

  // Catálogo de permisos (GET /admin/permisos), igual al seed V4 del back
  http.get(`${API_URL}/admin/permisos`, () => {
    return HttpResponse.json([
      {
        modulo: 'USUARIOS',
        permisos: [
          { codigo: 'USUARIO_VER', descripcion: 'Ver el listado y el detalle de usuarios' },
          { codigo: 'USUARIO_CREAR', descripcion: 'Dar de alta usuarios' },
          { codigo: 'USUARIO_EDITAR', descripcion: 'Modificar usuarios, bloquearlos y resetear su contraseña' },
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
    ]);
  }),
];
