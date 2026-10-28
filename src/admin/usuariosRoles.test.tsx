import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { authApi } from '../api/authApi';
import { renderRuta } from '../test/renderRuta';

describe('backoffice: roles de un usuario', () => {
  it('a un usuario que no está activo no se le pueden cambiar los roles, con el texto del backoffice', async () => {
    const { user } = await renderRuta('/admin/usuarios', {
      usuario: 'anonimo',
      prepara: async () => {
        await authApi.login('admin', 'admin123');
      },
    });
    const fila = (await screen.findByText('@lfernandez')).closest('tr')!;

    await user.click(within(fila).getByRole('button', { name: 'Roles' }));
    await user.click(await screen.findByRole('button', { name: 'Guardar Roles' }));

    expect(
      await screen.findByText('Solo se le pueden cambiar los roles a un usuario activo.')
    ).toBeInTheDocument();
  });
});
