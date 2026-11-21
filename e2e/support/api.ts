import { APIRequestContext, expect } from '@playwright/test';

/** La API de los E2E: con ella se arman los datos (el Arrange), nunca haciendo clics. */
export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:8080/api/v1';

/** La contraseña de todos los usuarios del seed de desarrollo (pica-back, R__seed_desarrollo.sql). */
export const CLAVE_SEED = 'PicaDev2026';

/** Usuarios del seed: existen siempre en la base de los E2E. */
export const SEED = {
  admin: 'admin',
  organizador: 'dev_organizador',
  arbitro: 'dev_arbitro',
  jugador: 'dev_jugador1',
} as const;

export const ROL = {
  SUPER_USUARIO: 1,
  ADMINISTRADOR: 2,
  ORGANIZADOR: 3,
  ARBITRO: 4,
  SOPORTE: 5,
  PARTICIPANTE: 6,
} as const;

export interface UsuarioCreado {
  id: number;
  username: string;
  password: string;
}

/** Un sufijo distinto por test: los datos no chocan aunque la base no se limpie entre corridas. */
export const unico = () =>
  `${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;

/** Un cliente de la API con la sesión de un usuario. */
export class Api {
  private constructor(
    private readonly request: APIRequestContext,
    private readonly token: string
  ) {}

  static async login(request: APIRequestContext, identificador: string, password = CLAVE_SEED) {
    const res = await request.post(`${API_URL}/auth/login`, { data: { identificador, password } });
    expect(res.status(), `login de ${identificador}`).toBe(200);
    const { accessToken } = await res.json();
    return new Api(request, accessToken);
  }

  async get<T = any>(ruta: string): Promise<T> {
    return this.pedir<T>('GET', ruta);
  }

  async post<T = any>(ruta: string, data?: unknown): Promise<T> {
    return this.pedir<T>('POST', ruta, data);
  }

  async put<T = any>(ruta: string, data?: unknown): Promise<T> {
    return this.pedir<T>('PUT', ruta, data);
  }

  async pedir<T>(
    method: string,
    ruta: string,
    data?: unknown,
    multipart?: Record<string, any>
  ): Promise<T> {
    const res = await this.request.fetch(`${API_URL}${ruta}`, {
      method,
      headers: { Authorization: `Bearer ${this.token}` },
      data,
      multipart,
    });
    if (!res.ok()) {
      throw new Error(`${method} ${ruta} respondió ${res.status()}: ${await res.text()}`);
    }
    const texto = await res.text();
    return (texto ? JSON.parse(texto) : undefined) as T;
  }

  /** Un usuario nuevo, activo y verificado, con los roles pedidos. Lo tiene que llamar un admin. */
  async crearUsuario(prefijo: string, roles: number[]): Promise<UsuarioCreado> {
    const sufijo = unico();
    const persona = await this.post<{ id: number }>('/admin/personas', {
      nombres: 'Prueba',
      apellidos: prefijo,
      tipoDoc: 'DNI',
      // 8 dígitos al azar desde 30.000.000: no choca con el seed (90.000.0xx)
      nroDoc: String(30_000_000 + Math.floor(Math.random() * 50_000_000)),
      fechaNacimiento: '1995-05-05',
    });
    const username = `e2e_${prefijo}_${sufijo}`.slice(0, 30);
    const usuario = await this.post<{ id: number }>('/admin/usuarios', {
      username,
      email: `${username}@pica.local`,
      passwordTemporal: CLAVE_SEED,
      personaId: persona.id,
      roles,
    });
    return { id: usuario.id, username, password: CLAVE_SEED };
  }
}
