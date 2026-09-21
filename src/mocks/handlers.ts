import { http, HttpResponse } from 'msw';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const handlers = [
  // Public Info Endpoint
  http.get(`${API_URL}/info`, () => {
    return HttpResponse.json({
      name: 'PICA - Plataforma Integrada de Control y Administración',
      version: '1.0.0-beta',
      status: 'operational',
      environment: 'development',
      message: 'MSW Mock Server interceptando peticiones del contrato API',
    });
  }),

  // Auth: Register Endpoint
  http.post(`${API_URL}/auth/register`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      email?: string;
      password?: string;
    };

    if (body.email === 'existente@pica.edu.ar' || body.email === 'admin@pica.edu.ar') {
      return new HttpResponse(
        JSON.stringify({
          error: 'Conflict',
          field: 'email',
          message: 'Este correo electrónico ya se encuentra registrado',
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new HttpResponse(
      JSON.stringify({
        success: true,
        message: 'Usuario registrado exitosamente. Se envió un correo de verificación.',
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  }),

  // Auth: Verify Email Token Endpoint
  http.post(`${API_URL}/auth/verify-email`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { token?: string };

    if (!body.token || body.token === 'expired-token' || body.token === 'invalid-token') {
      return new HttpResponse(
        JSON.stringify({
          success: false,
          error: 'El enlace de verificación es inválido o ha expirado.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return HttpResponse.json({
      success: true,
      message: 'Tu cuenta ha sido verificada correctamente. Ya podés iniciar sesión.',
    });
  }),

  // Auth: Login Endpoint (Username / Email + Password)
  http.post(`${API_URL}/auth/login`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      identifier?: string;
      email?: string;
      password?: string;
    };

    const id = body.identifier || body.email || '';

    if (id === 'noverificado@pica.edu.ar') {
      return new HttpResponse(
        JSON.stringify({
          error: 'unverified_email',
          message: 'Tu cuenta aún no ha sido verificada. Revisá tu casilla de correo para activarla.',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (id === 'bloqueado@pica.edu.ar') {
      return new HttpResponse(
        JSON.stringify({
          error: 'account_locked',
          message: 'Tu cuenta ha sido bloqueada. Por favor, contactá al administrador.',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if ((id === 'admin@pica.edu.ar' || id === 'admin') && body.password === 'admin123') {
      return HttpResponse.json({
        accessToken: 'mock-jwt-access-token-admin-12345',
        refreshToken: 'mock-jwt-refresh-token-admin-67890',
        user: {
          id: 'usr_001',
          name: 'Administrador PICA',
          email: 'admin@pica.edu.ar',
          role: 'ADMIN',
          permissions: ['admin:access', 'users:read', 'users:write'],
        },
      });
    }

    if ((id === 'user@pica.edu.ar' || id === 'usuario') && body.password === 'user123') {
      return HttpResponse.json({
        accessToken: 'mock-jwt-access-token-user-12345',
        refreshToken: 'mock-jwt-refresh-token-user-67890',
        user: {
          id: 'usr_002',
          name: 'Usuario PICA',
          email: 'user@pica.edu.ar',
          role: 'USER',
          permissions: ['dashboard:read'],
        },
      });
    }

    if (id && body.password) {
      return HttpResponse.json({
        accessToken: `mock-jwt-access-token-${Date.now()}`,
        refreshToken: `mock-jwt-refresh-token-${Date.now()}`,
        user: {
          id: 'usr_003',
          name: id.split('@')[0],
          email: id.includes('@') ? id : `${id}@pica.edu.ar`,
          role: 'USER',
          permissions: ['dashboard:read'],
        },
      });
    }

    return new HttpResponse(
      JSON.stringify({ error: 'invalid_credentials', message: 'Usuario/email o contraseña incorrectos.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }),

  // Auth: OAuth2 Code Exchange Endpoint (/auth/exchange)
  http.post(`${API_URL}/auth/exchange`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { code?: string };

    if (!body.code || body.code === 'invalid-code') {
      return new HttpResponse(
        JSON.stringify({ error: 'invalid_code', message: 'El código de autorización OAuth es inválido o ha expirado.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (body.code.includes('admin')) {
      return HttpResponse.json({
        accessToken: 'mock-oauth-access-token-admin-999',
        refreshToken: 'mock-oauth-refresh-token-admin-999',
        user: {
          id: 'usr_001',
          name: 'Administrador PICA (Google)',
          email: 'admin@pica.edu.ar',
          role: 'ADMIN',
          permissions: ['admin:access', 'users:read', 'users:write'],
        },
      });
    }

    return HttpResponse.json({
      accessToken: 'mock-oauth-access-token-user-888',
      refreshToken: 'mock-oauth-refresh-token-user-888',
      user: {
        id: 'usr_002',
        name: 'Usuario Google PICA',
        email: 'google.user@pica.edu.ar',
        role: 'USER',
        permissions: ['dashboard:read'],
      },
    });
  }),

  // Auth: Refresh Token Endpoint
  http.post(`${API_URL}/auth/refresh`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { refreshToken?: string };

    if (!body.refreshToken || body.refreshToken === 'expired-token') {
      return new HttpResponse(
        JSON.stringify({ error: 'Refresh token expirado o inválido' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return HttpResponse.json({
      accessToken: `mock-jwt-access-token-refreshed-${Date.now()}`,
      refreshToken: body.refreshToken,
    });
  }),

  // Auth: Get Current User (/auth/me) Endpoint
  http.get(`${API_URL}/auth/me`, ({ request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new HttpResponse(
        JSON.stringify({ error: 'No autorizado. Token de acceso faltante.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    if (token.includes('admin')) {
      return HttpResponse.json({
        id: 'usr_001',
        name: 'Administrador PICA',
        email: 'admin@pica.edu.ar',
        role: 'ADMIN',
        permissions: ['admin:access', 'users:read', 'users:write'],
      });
    }

    return HttpResponse.json({
      id: 'usr_002',
      name: 'Usuario PICA',
      email: 'user@pica.edu.ar',
      role: 'USER',
      permissions: ['dashboard:read'],
    });
  }),

  // Auth: Logout Endpoint
  http.post(`${API_URL}/auth/logout`, () => {
    return HttpResponse.json({ message: 'Sesión cerrada exitosamente en el servidor' });
  }),

  // Admin Stats Contract Endpoint
  http.get(`${API_URL}/admin/stats`, ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new HttpResponse(
        JSON.stringify({ error: 'Requiere autenticación' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return HttpResponse.json({
      totalUsers: 142,
      activeProjects: 18,
      systemStatus: 'Optimal',
      lastBackup: new Date().toISOString(),
    });
  }),
];
