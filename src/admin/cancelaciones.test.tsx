import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { server } from '../mocks/server';
import { renderRuta } from '../test/renderRuta';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

describe('Cancelaciones en revisión, para soporte (HU-605)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('soporte, solo con CANCELACION_REVISAR, entra al backoffice y llega a la cola desde el menú', async () => {
    const { user, ubicacion } = await renderRuta('/admin', { usuario: 'soporte' });

    const [enElMenu] = await screen.findAllByRole('link', { name: 'Cancelaciones' });
    await user.click(enElMenu);

    expect(ubicacion()).toBe('/admin/cancelaciones');
    expect(
      await screen.findByRole('heading', { name: 'Cancelaciones en revisión' })
    ).toBeInTheDocument();
  });

  it('la cola trae cada cancelación con su organizador, el pozo y los gastos, la más vieja primero', async () => {
    await renderRuta('/admin/cancelaciones', { usuario: 'soporte' });

    const filas = await screen.findAllByRole('row');
    expect(filas[1]).toHaveTextContent('Copa Otoño');
    expect(filas[1]).toHaveTextContent('organizador');
    expect(filas[1]).toHaveTextContent('$ 3.000,00');
    expect(filas[1]).toHaveTextContent('$ 450,50');
    expect(filas[2]).toHaveTextContent('Relámpago de Primavera');
  });

  it('al abrir una cancelación se ven el motivo y cada gasto, y el comprobante se abre en otra pestaña', async () => {
    const ventana = { location: { href: '' }, close: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(ventana as unknown as Window);
    // jsdom no implementa las URL de objetos: se agregan solo para esta prueba
    Object.assign(URL, {
      createObjectURL: () => 'blob:comprobante',
      revokeObjectURL: () => undefined,
    });
    const { user } = await renderRuta('/admin/cancelaciones', { usuario: 'soporte' });

    await user.click(await screen.findByRole('button', { name: 'Revisar Copa Otoño' }));

    const detalle = await screen.findByRole('region', { name: 'Cancelación de Copa Otoño' });
    expect(within(detalle).getByText('Se inundó la cancha')).toBeInTheDocument();
    expect(within(detalle).getByText('Alquiler de la cancha')).toBeInTheDocument();
    await user.click(within(detalle).getByRole('button', { name: 'Ver comprobante de Árbitro' }));
    await vi.waitFor(() => expect(ventana.location.href).toBe('blob:comprobante'));
  });

  it('sin el permiso no se ve la cola', async () => {
    await renderRuta('/admin/cancelaciones', { usuario: 'participante' });

    expect(
      screen.queryByRole('heading', { name: 'Cancelaciones en revisión' })
    ).not.toBeInTheDocument();
  });

  describe('resolver una cancelación', () => {
    const revisar = async () => {
      const r = await renderRuta('/admin/cancelaciones', { usuario: 'soporte' });
      await r.user.click(await screen.findByRole('button', { name: 'Revisar Copa Otoño' }));
      return {
        ...r,
        detalle: await screen.findByRole('region', { name: 'Cancelación de Copa Otoño' }),
      };
    };

    it('aprobar muestra lo que cobra el organizador y lo que se descuenta a cada uno, y saca el caso de la cola', async () => {
      const { user, detalle } = await revisar();

      await user.click(within(detalle).getByRole('button', { name: 'Aprobar gastos' }));
      const confirmar = await screen.findByRole('dialog', {
        name: 'Aprobar los gastos de Copa Otoño',
      });
      expect(confirmar).toHaveTextContent(
        'El organizador cobra $ 450,50. A cada inscripto se le descuenta el 15,02 % de su inscripción; los gastos administrativos vuelven enteros.'
      );
      await user.click(within(confirmar).getByRole('button', { name: 'Aprobar' }));

      expect(
        await screen.findByText(
          'Se aprobaron los gastos de Copa Otoño: el organizador cobró $ 450,50.'
        )
      ).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Revisar Copa Otoño' })).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Revisar Relámpago de Primavera' })
      ).toBeInTheDocument();
    });

    it('rechazar pide el motivo y, con él, devuelve todo y saca el caso de la cola', async () => {
      const cuerpos: unknown[] = [];
      server.use(
        http.post(`${API_URL}/admin/cancelaciones/31/rechazar`, async ({ request }) => {
          cuerpos.push(await request.clone().json());
        })
      );
      const { user, detalle } = await revisar();

      await user.click(within(detalle).getByRole('button', { name: 'Rechazar gastos' }));
      const modal = await screen.findByRole('dialog', {
        name: 'Rechazar los gastos de Copa Otoño',
      });
      const rechazar = within(modal).getByRole('button', { name: 'Rechazar y devolver todo' });
      expect(rechazar).toBeDisabled();
      await user.type(
        within(modal).getByLabelText(/Motivo del rechazo/),
        'Los comprobantes no son del torneo'
      );
      await user.click(rechazar);

      expect(
        await screen.findByText(
          'Se rechazaron los gastos de Copa Otoño: se devolvió todo a los participantes.'
        )
      ).toBeInTheDocument();
      expect(cuerpos).toEqual([{ motivo: 'Los comprobantes no son del torneo' }]);
      expect(screen.queryByRole('button', { name: 'Revisar Copa Otoño' })).not.toBeInTheDocument();
    });

    it('si otro ya la resolvió, avisa y vuelve a cargar la cola', async () => {
      let pedidosDeCola = 0;
      server.use(
        http.get(`${API_URL}/admin/cancelaciones`, () => {
          pedidosDeCola++;
        }),
        http.post(`${API_URL}/admin/cancelaciones/31/aprobar`, () =>
          HttpResponse.json(
            {
              status: 409,
              codigo: 'CANCELACION_YA_RESUELTA',
              detail: 'Ya se resolvió',
              estado: 'RECHAZADA',
            },
            { status: 409, headers: { 'Content-Type': 'application/problem+json' } }
          )
        )
      );
      const { user, detalle } = await revisar();

      await user.click(within(detalle).getByRole('button', { name: 'Aprobar gastos' }));
      await user.click(
        within(await screen.findByRole('dialog')).getByRole('button', { name: 'Aprobar' })
      );

      expect(await screen.findByText('Esta cancelación ya se resolvió.')).toBeInTheDocument();
      await vi.waitFor(() => expect(pedidosDeCola).toBe(2));
    });
  });
});
