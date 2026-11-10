import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderRuta } from '../test/renderRuta';

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
});
