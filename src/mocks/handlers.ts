import { http, HttpResponse } from 'msw';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const handlers = [
  // Public Info Contract Endpoint
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
        token: 'mock-jwt-token-admin-pica-12345',
        user: {
          id: 'usr_001',
          name: 'Administrador PICA',
          email: 'admin@pica.edu.ar',
          role: 'ADMIN',
        },
      });
    }

    if (body.email && body.password) {
      return HttpResponse.json({
        token: 'mock-jwt-token-user-pica-67890',
        user: {
          id: 'usr_002',
          name: 'Usuario PICA',
          email: body.email,
          role: 'USER',
        },
      });
    }

    return new HttpResponse(
      JSON.stringify({ error: 'Credenciales inválidas' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }),

  // Admin Stats Contract Endpoint
  http.get(`${API_URL}/admin/stats`, () => {
    return HttpResponse.json({
      totalUsers: 142,
      activeProjects: 18,
      systemStatus: 'Optimal',
      lastBackup: new Date().toISOString(),
    });
  }),
];
