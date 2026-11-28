import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderRuta } from '../test/renderRuta';

// Entra por /admin sin sesión, el guard lo manda al login y después del login vuelve a /admin
const entrarAlAdminCon = async (identificador: string, password: string) => {
  const pantalla = await renderRuta('/admin', { usuario: 'anonimo' });
  const { user } = pantalla;

  await user.type(await screen.findByLabelText('Usuario o email'), identificador);
  await user.type(screen.getByLabelText('Contraseña'), password);
  await user.click(screen.getByRole('button', { name: 'Ingresar' }));

  return pantalla;
};

const menu = () => within(screen.getAllByRole('navigation', { name: 'Navegación principal' })[0]);

describe('Acceso al backoffice (HU-701)', () => {
  it('un usuario general inicia sesión pero el backoffice le niega el acceso', async () => {
    const { ubicacion } = await entrarAlAdminCon('usuario', 'user123');

    expect(await screen.findByRole('heading', { name: 'Acceso Denegado' })).toBeInTheDocument();
    expect(ubicacion()).toBe('/unauthorized');
    expect(screen.queryByRole('link', { name: 'Backoffice' })).not.toBeInTheDocument();
  });

  it('un administrador inicia sesión y entra al backoffice con todas las secciones', async () => {
    const { ubicacion } = await entrarAlAdminCon('admin', 'admin123');

    expect(await menu().findByRole('link', { name: 'Panel' })).toBeInTheDocument();
    expect(ubicacion()).toBe('/admin');
    for (const seccion of ['Usuarios', 'Roles', 'Personas', 'Parámetros', 'Reclamos', 'Auditoría']) {
      expect(menu().getByRole('link', { name: seccion })).toBeInTheDocument();
    }
  });

  it('soporte inicia sesión y entra al backoffice solo con sus secciones', async () => {
    const { ubicacion } = await entrarAlAdminCon('soporte', 'sop123');

    expect(await menu().findByRole('link', { name: 'Panel' })).toBeInTheDocument();
    expect(ubicacion()).toBe('/admin');
    for (const seccion of ['Usuarios', 'Cancelaciones', 'Reclamos', 'Auditoría']) {
      expect(menu().getByRole('link', { name: seccion })).toBeInTheDocument();
    }
    for (const seccion of ['Roles', 'Personas', 'Parámetros']) {
      expect(menu().queryByRole('link', { name: seccion })).not.toBeInTheDocument();
    }
  });

  it('soporte que escribe la URL de parámetros ve el acceso denegado', async () => {
    await renderRuta('/admin/parametros', { usuario: 'soporte' });

    expect(await screen.findByRole('heading', { name: 'Acceso Denegado' })).toBeInTheDocument();
  });
});
