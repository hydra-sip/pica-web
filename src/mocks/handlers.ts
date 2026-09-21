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

  // Auth: Login Endpoint
  http.post(`${API_URL}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };

    if (body.email === 'admin@pica.edu.ar' && body.password === 'admin123') {
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

    if (body.email === 'user@pica.edu.ar' && body.password === 'user123') {
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

    if (body.email && body.password) {
      return HttpResponse.json({
        accessToken: `mock-jwt-access-token-${Date.now()}`,
        refreshToken: `mock-jwt-refresh-token-${Date.now()}`,
        user: {
          id: 'usr_003',
          name: body.email.split('@')[0],
          email: body.email,
          role: 'USER',
          permissions: ['dashboard:read'],
        },
      });
    }

    return new HttpResponse(
      JSON.stringify({ error: 'Credenciales inválidas' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
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
