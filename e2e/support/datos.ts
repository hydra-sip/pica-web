import { APIRequestContext, expect } from '@playwright/test';
import { Api, ROL, SEED, UsuarioCreado, unico } from './api';

/**
 * El Arrange de los flujos críticos (PICA-438): todo por la API, así el test solo hace clics en lo que prueba.
 * Cada dato es nuevo (nombre con sufijo único), para que los tests no dependan del orden ni de otro test.
 */

const enHoras = (horas: number) => new Date(Date.now() + horas * 3_600_000).toISOString();

export interface Jugador extends UsuarioCreado {
  api: Api;
}

/** Un participante nuevo con saldo en la billetera (carga simulada). */
export async function jugadorConSaldo(
  admin: Api,
  request: APIRequestContext,
  prefijo: string,
  saldo = 5000
): Promise<Jugador> {
  const usuario = await admin.crearUsuario(prefijo, [ROL.PARTICIPANTE]);
  const api = await Api.login(request, usuario.username);
  await api.post('/billetera/cargas', { monto: saldo });
  return { ...usuario, api };
}

export interface Torneo {
  id: number;
  nombre: string;
  slug: string;
}

/**
 * Un torneo individual publicado de dev_organizador, con la inscripción abierta: $ 1.000 de inscripción (más el
 * 10 % de gastos administrativos) y todo el pozo al campeón. Con `conArbitro`, dev_arbitro ya aceptó: sin eso no
 * se puede sortear el bracket.
 */
export async function torneoPublicado(
  organizador: Api,
  {
    cupo = 4,
    conArbitro = false,
    arbitro,
  }: { cupo?: number; conArbitro?: boolean; arbitro?: Api } = {}
): Promise<Torneo> {
  const nombre = `Copa E2E ${unico()}`;
  const { id } = await organizador.post<{ id: number }>('/torneos', {
    nombre,
    disciplina: 'Ajedrez',
    tipoParticipante: 'INDIVIDUAL',
    modalidad: 'PRESENCIAL',
    sede: 'Club E2E',
    fechaInicio: enHoras(3),
    fechaFin: enHoras(24),
    cierreInscripcionEn: enHoras(1),
    cupoMaximo: cupo,
    cupoMinimo: 2,
    reglamentoTexto: 'Reglamento de prueba.',
  });
  await organizador.put(`/torneos/${id}/economia`, { valorInscripcion: 1000, premios: [100] });
  if (conArbitro && arbitro) {
    const { usuario } = await arbitro.get<{ usuario: { id: number } }>('/me');
    await organizador.post(`/torneos/${id}/arbitros`, {
      usuarioId: usuario.id,
      permisos: ['CARGAR_RESULTADOS'],
    });
    await arbitro.post(`/designaciones/${id}/aceptar`, { compromisoAceptado: true });
  }
  const publicado = await organizador.post<{ slug: string }>(`/torneos/${id}/publicar`, {
    aceptaTerminos: true,
  });
  return { id, nombre, slug: publicado.slug };
}

/** Inscripción individual confirmada y pagada con saldo. */
export async function inscribirYPagar(jugador: Jugador, torneoId: number): Promise<number> {
  const { id } = await jugador.api.post<{ id: number }>(`/torneos/${torneoId}/inscripciones`);
  await jugador.api.put(`/inscripciones/${id}/confirmar`, { reglamentoAceptado: true });
  await jugador.api.post(`/inscripciones/${id}/pago`);
  return id;
}

interface Partido {
  id: number;
  local: { nombre: string };
  visitante: { nombre: string };
}

/** Sortea el bracket (el torneo pasa a EN_CURSO) y devuelve la final de un torneo de dos. */
export async function sortearFinal(organizador: Api, torneoId: number): Promise<Partido> {
  const bracket = await organizador.post<{ rondas: { partidos: Partido[] }[] }>(
    `/torneos/${torneoId}/bracket`
  );
  return bracket.rondas[0].partidos[0];
}

export interface Rifa {
  id: number;
  titulo: string;
}

/** Una rifa de dev_organizador en venta: números del 1 al 20 a $ 500 y un solo premio. */
export async function rifaEnVenta(organizador: Api): Promise<Rifa> {
  const titulo = `Rifa E2E ${unico()}`;
  const { id } = await organizador.post<{ id: number }>('/rifas', {
    titulo,
    numeroDesde: 1,
    numeroHasta: 20,
    precioNumero: 500,
    ventaHasta: enHoras(24),
    fechaSorteo: enHoras(48),
  });
  await organizador.put(`/rifas/${id}/premios`, {
    premios: [{ pct: 100, descripcion: 'Una pelota' }],
  });
  await organizador.post(`/rifas/${id}/publicar`, {
    aceptaTerminos: true,
    declaraAutorizacionLoteria: true,
  });
  return { id, titulo };
}

/**
 * Cierra la venta y espera el sorteo. En el back de los E2E el sorteo es a los 3 s del cierre
 * (APP_RIFAS_SORTEO_ANTICIPADO) y la semilla sale de drand.
 */
export async function cerrarYSortear(organizador: Api, request: APIRequestContext, rifaId: number) {
  await organizador.post(`/rifas/${rifaId}/cerrar-venta`);
  const publico = await Api.login(request, SEED.jugador);
  await expect
    .poll(
      async () => {
        try {
          await publico.get(`/rifas/publicas/${rifaId}/sorteo`);
          return 'SORTEADA';
        } catch {
          return 'ESPERANDO';
        }
      },
      { timeout: 30_000, message: 'la rifa no se sorteó' }
    )
    .toBe('SORTEADA');
}
