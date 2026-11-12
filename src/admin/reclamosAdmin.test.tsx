import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { authApi } from '../api/authApi';
import { ReclamoAdminResumen } from '../api/reclamoAdminApi';
import { problema, validacion } from '../mocks/adminHandlers';
import { server } from '../mocks/server';
import { renderRuta } from '../test/renderRuta';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const comoUsuario = (identificador: string, password: string, ruta: string) =>
  renderRuta(ruta, {
    usuario: 'anonimo',
    prepara: async () => {
      await authApi.login(identificador, password);
    },
  });

describe('HU-706 / T706-2 (PICA-340): Reclamos y resolución en el admin', () => {
  it('el SUPER_USUARIO ve Reclamos en el menú y en el panel, y navega al listado', async () => {
    const { user, ubicacion } = await comoUsuario('admin', 'admin123', '/admin');

    const cardAcceso = await screen.findByRole('link', { name: /reclamos de rifas/i });
    expect(cardAcceso).toHaveAttribute('href', '/admin/reclamos');

    const [linkMenu] = screen.getAllByRole('link', { name: 'Reclamos' });
    await user.click(linkMenu);
    expect(ubicacion()).toBe('/admin/reclamos');

    expect(await screen.findByRole('heading', { name: 'Reclamos de rifas' })).toBeInTheDocument();
  });

  it('el rol SOPORTE (solo RECLAMO_RESOLVER) accede al backoffice y solo ve Panel y Reclamos', async () => {
    const { user, ubicacion } = await comoUsuario('soporte', 'soporte123', '/');

    const linksBackoffice = await screen.findAllByRole('link', { name: /backoffice/i });
    expect(linksBackoffice.length).toBeGreaterThan(0);

    await user.click(linksBackoffice[0]);
    expect(ubicacion()).toBe('/admin');

    expect(await screen.findAllByRole('link', { name: 'Reclamos' })).not.toHaveLength(0);
    expect(screen.queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Roles' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Personas' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Parámetros' })).not.toBeInTheDocument();

    await user.click(screen.getAllByRole('link', { name: 'Reclamos' })[0]);
    expect(ubicacion()).toBe('/admin/reclamos');
    expect(await screen.findByText('Gran Rifa Benéfica de la Copa')).toBeInTheDocument();
  });

  it('sin el permiso RECLAMO_RESOLVER no ve Reclamos en el menú y redirige a /unauthorized en listado', async () => {
    const r1 = await renderRuta('/admin/reclamos', { usuario: 'participante' });
    await waitFor(() => expect(r1.ubicacion()).toBe('/unauthorized'));
    expect(await screen.findByRole('heading', { name: 'Acceso Denegado' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Reclamos' })).not.toBeInTheDocument();
  });

  it('un usuario con otros permisos de backoffice pero sin RECLAMO_RESOLVER tampoco entra al detalle', async () => {
    const r2 = await renderRuta('/admin/reclamos/1', { usuario: 'sinPermiso' });
    await waitFor(() => expect(r2.ubicacion()).toBe('/unauthorized'));
    expect(await screen.findByRole('heading', { name: 'Acceso Denegado' })).toBeInTheDocument();
  });

  it('lista los reclamos con PENDIENTE primero y permite filtrar por estado y paginar', async () => {
    const { user } = await comoUsuario('admin', 'admin123', '/admin/reclamos');

    const tabla = await screen.findByRole('table');
    const filas = within(tabla).getAllByRole('row').slice(1);
    expect(filas).toHaveLength(4);

    // Los primeros dos son los PENDIENTE
    expect(filas[0]).toHaveTextContent('#1');
    expect(filas[0]).toHaveTextContent('Pendiente');
    expect(filas[0]).toHaveTextContent('@jperez');
    expect(filas[1]).toHaveTextContent('#2');
    expect(filas[1]).toHaveTextContent('Pendiente');
    expect(filas[2]).toHaveTextContent('#3');
    expect(filas[2]).toHaveTextContent('Aceptado');
    expect(filas[3]).toHaveTextContent('#4');
    expect(filas[3]).toHaveTextContent('Rechazado');

    // Filtrar por Pendientes
    await user.click(screen.getByRole('button', { name: 'Pendientes' }));
    const filasPendientes = within(await screen.findByRole('table')).getAllByRole('row').slice(1);
    expect(filasPendientes).toHaveLength(2);

    // Filtrar por Aceptados
    await user.click(screen.getByRole('button', { name: 'Aceptados' }));
    const filasAceptados = within(await screen.findByRole('table')).getAllByRole('row').slice(1);
    expect(filasAceptados).toHaveLength(1);
    expect(filasAceptados[0]).toHaveTextContent('Rifa Aniversario Club Norte');

    // Filtrar por Rechazados
    await user.click(screen.getByRole('button', { name: 'Rechazados' }));
    const filasRechazados = within(await screen.findByRole('table')).getAllByRole('row').slice(1);
    expect(filasRechazados).toHaveLength(1);
    expect(filasRechazados[0]).toHaveTextContent('Rifa Clausura Primavera');
  });

  it('soporta paginación del servidor en el listado', async () => {
    const paginasPedidas: string[] = [];
    const crearItem = (id: number): ReclamoAdminResumen => ({
      id,
      motivo: `Motivo de prueba ${id}`,
      estado: 'PENDIENTE',
      resolucion: null,
      resueltoEn: null,
      resueltoPor: null,
      creadoEn: '2026-11-10T10:00:00Z',
      rifa: {
        id: 10,
        titulo: `Rifa paginada ${id}`,
        estado: 'EN_REVISION',
        torneoNombre: null,
        fechaSorteo: '2026-10-26T21:00:00Z',
        semillaObtenidaEn: '2026-10-26T21:00:05Z',
      },
      reclamante: { id: 2, username: `user${id}`, email: `user${id}@pica.edu.ar` },
    });

    server.use(
      http.get(`${API_URL}/admin/reclamos`, ({ request }) => {
        const url = new URL(request.url);
        const p = Number(url.searchParams.get('page') ?? 0);
        paginasPedidas.push(String(p));
        return HttpResponse.json({
          content: p === 0 ? [crearItem(101)] : [crearItem(102)],
          page: { size: 20, number: p, totalElements: 21, totalPages: 2 },
        });
      })
    );

    const { user } = await comoUsuario('admin', 'admin123', '/admin/reclamos');

    expect(await screen.findByText('Rifa paginada 101')).toBeInTheDocument();
    expect(screen.getByText('Mostrando 1 a 20 de 21 reclamos')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /siguiente/i }));
    expect(await screen.findByText('Rifa paginada 102')).toBeInTheDocument();
    expect(paginasPedidas).toEqual(['0', '1']);
  });

  it('muestra el detalle completo, verifica criptográficamente el sorteo y resuelve SIN_FRAUDE', async () => {
    const cuerpos: unknown[] = [];
    server.use(
      http.post(`${API_URL}/admin/reclamos/:id/resolucion`, async ({ request }) => {
        cuerpos.push(await request.clone().json());
      })
    );

    const { user } = await comoUsuario('admin', 'admin123', '/admin/reclamos/1');

    expect(await screen.findByRole('heading', { name: 'Reclamo #1' })).toBeInTheDocument();
    expect(screen.getByText('@jperez')).toBeInTheDocument();
    expect(screen.getByText('juan.perez@example.com')).toBeInTheDocument();
    expect(
      screen.getByText('Solicito revisión de la semilla de drand y del cálculo del primer premio.')
    ).toBeInTheDocument();

    // Datos del sorteo reutilizando GET /rifas/publicas/10/sorteo y recalculación en el navegador
    expect(await screen.findByTestId('semilla-valor-rifa')).toHaveTextContent(/^f8e652f8/);
    await user.click(screen.getByTestId('btn-recalcular-rifa'));
    expect(await screen.findByTestId('banner-verificacion-exitosa-rifa')).toBeInTheDocument();

    // Validación cliente: sin decisión ni fundamentación no abre confirmación
    await user.click(screen.getByRole('button', { name: 'Emitir resolución' }));
    expect(await screen.findByText('Seleccioná una decisión.')).toBeInTheDocument();
    expect(
      screen.getByText('Ingresá la fundamentación de la resolución.')
    ).toBeInTheDocument();

    // Elegir SIN_FRAUDE y fundamentar
    await user.click(screen.getByLabelText(/sin fraude \(rechazar reclamo\)/i));
    await user.type(
      screen.getByLabelText(/resolución \/ fundamentación/i),
      'Verificado con drand y SHA-256: todos los ganadores coinciden.'
    );
    await user.click(screen.getByRole('button', { name: 'Emitir resolución' }));

    // Modal de confirmación
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Sin fraude — Reclamo rechazado/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar resolución' }));

    // Éxito y cambio a solo lectura
    expect(await screen.findByRole('status')).toHaveTextContent(/sin fraude, el reclamo quedó rechazado/i);
    expect(cuerpos).toEqual([
      {
        decision: 'SIN_FRAUDE',
        resolucion: 'Verificado con drand y SHA-256: todos los ganadores coinciden.',
      },
    ]);
    expect(screen.getByText('Rechazado')).toBeInTheDocument();
    expect(screen.getByText('Rifa: Sorteada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Emitir resolución' })).not.toBeInTheDocument();
    expect(screen.getByTestId('reclamo-resolucion-emitida')).toHaveTextContent('admin');
  });

  it('detecta discrepancia criptográfica en la rifa 40 y permite resolver FRAUDE_CONFIRMADO como SOPORTE', async () => {
    const cuerpos: unknown[] = [];
    server.use(
      http.post(`${API_URL}/admin/reclamos/:id/resolucion`, async ({ request }) => {
        cuerpos.push(await request.clone().json());
      })
    );

    const { user } = await comoUsuario('soporte', 'soporte123', '/admin/reclamos/2');

    expect(await screen.findByRole('heading', { name: 'Reclamo #2' })).toBeInTheDocument();
    await screen.findByTestId('btn-recalcular-rifa');
    await user.click(screen.getByTestId('btn-recalcular-rifa'));

    expect(await screen.findByTestId('banner-discrepancia-detectada-rifa')).toBeInTheDocument();

    await user.click(screen.getByLabelText(/fraude confirmado \(aceptar reclamo\)/i));
    await user.type(
      screen.getByLabelText(/resolución \/ fundamentación/i),
      'El número ganador publicado (#44) difiere del calculado (#22). Se cancela la rifa.'
    );
    await user.click(screen.getByRole('button', { name: 'Emitir resolución' }));

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar resolución' }));

    expect(await screen.findByRole('status')).toHaveTextContent(/se confirmó fraude/i);
    expect(cuerpos).toEqual([
      {
        decision: 'FRAUDE_CONFIRMADO',
        resolucion:
          'El número ganador publicado (#44) difiere del calculado (#22). Se cancela la rifa.',
      },
    ]);
    expect(screen.getByText('Aceptado')).toBeInTheDocument();
    expect(screen.getByText('Rifa: Cancelada')).toBeInTheDocument();
    expect(screen.getByTestId('reclamo-resolucion-emitida')).toHaveTextContent('soporte');
  });

  it('un reclamo ya resuelto se muestra en solo lectura sin formulario de resolución', async () => {
    await comoUsuario('admin', 'admin123', '/admin/reclamos/3');

    expect(await screen.findByRole('heading', { name: 'Reclamo #3' })).toBeInTheDocument();
    expect(screen.getByText('Aceptado')).toBeInTheDocument();
    expect(screen.getByText('Rifa: Cancelada')).toBeInTheDocument();
    const emitida = screen.getByTestId('reclamo-resolucion-emitida');
    expect(emitida).toHaveTextContent('Fraude confirmado — Reclamo aceptado');
    expect(emitida).toHaveTextContent('soporte');
    expect(screen.queryByRole('button', { name: 'Emitir resolución' })).not.toBeInTheDocument();

    // Si el sorteo no devuelve datos (ej. rifa cancelada sin datos públicos), avisa sin romper la vista
    expect(await screen.findByText(/todavía no fue sorteada/i)).toBeInTheDocument();
  });

  it('muestra 404 RECLAMO_NO_ENCONTRADO si el reclamo no existe', async () => {
    await comoUsuario('admin', 'admin123', '/admin/reclamos/999');

    expect(await screen.findByRole('alert')).toHaveTextContent('El reclamo no existe.');
    expect(screen.getByRole('link', { name: /volver a reclamos/i })).toHaveAttribute(
      'href',
      '/admin/reclamos'
    );
  });

  it('maneja errores 400 VALIDACION, 403 SIN_PERMISO y 409 RECLAMO_YA_RESUELTO al resolver', async () => {
    // 1. 400 VALIDACION
    server.use(
      http.post(`${API_URL}/admin/reclamos/1/resolucion`, () =>
        validacion([
          { campo: 'resolucion', codigo: 'LONGITUD', mensaje: 'Entre 10 y 2000 caracteres' },
        ])
      )
    );

    const { user } = await comoUsuario('admin', 'admin123', '/admin/reclamos/1');
    await screen.findByRole('heading', { name: 'Reclamo #1' });

    await user.click(screen.getByLabelText(/sin fraude/i));
    await user.type(screen.getByLabelText(/resolución \/ fundamentación/i), 'Corto');
    await user.click(screen.getByRole('button', { name: 'Emitir resolución' }));
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirmar resolución' })
    );

    expect(await screen.findByText('El largo no es válido.')).toBeInTheDocument();

    // 2. 403 SIN_PERMISO
    server.use(
      http.post(`${API_URL}/admin/reclamos/1/resolucion`, () =>
        problema(403, 'SIN_PERMISO', 'No tenés permiso para resolver reclamos')
      )
    );
    await user.click(screen.getByRole('button', { name: 'Emitir resolución' }));
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirmar resolución' })
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('No tenés permiso para hacer esto.');

    // 3. 409 RECLAMO_YA_RESUELTO (otro operador lo resolvió antes) → muestra error y recarga estado
    server.use(
      http.post(`${API_URL}/admin/reclamos/1/resolucion`, () =>
        problema(409, 'RECLAMO_YA_RESUELTO', 'Este reclamo ya fue resuelto')
      ),
      http.get(`${API_URL}/admin/reclamos/1`, () =>
        HttpResponse.json({
          id: 1,
          motivo: 'Solicito revisión de la semilla de drand y del cálculo del primer premio.',
          estado: 'RECHAZADO',
          resolucion: 'Resuelto por otro operador.',
          resueltoEn: '2026-11-11T12:00:00Z',
          resueltoPor: 'soporte',
          creadoEn: '2026-11-10T15:30:00Z',
          rifa: {
            id: 10,
            titulo: 'Gran Rifa Benéfica de la Copa',
            estado: 'SORTEADA',
            torneoNombre: 'Copa PICA 2026 - Eliminación Directa',
            fechaSorteo: '2026-10-26T21:00:00Z',
            semillaObtenidaEn: '2026-10-26T21:00:05Z',
          },
          reclamante: { id: 2, username: 'jperez', email: 'juan.perez@example.com' },
        })
      )
    );

    await user.click(screen.getByRole('button', { name: 'Emitir resolución' }));
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirmar resolución' })
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Este reclamo ya fue resuelto anteriormente.'
    );
    expect(await screen.findByTestId('reclamo-resolucion-emitida')).toHaveTextContent(
      'Resuelto por otro operador.'
    );
  });
});
