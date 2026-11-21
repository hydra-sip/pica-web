import { AdminPage } from '../pages/AdminPage';
import { LoginPage } from '../pages/LoginPage';
import { ROL, SEED } from '../support/api';
import { expect, test } from '../support/test';

// Flujo crítico 5 (HU-701): el backoffice se abre por permisos, no por estar logueado.
test('un usuario general no entra al backoffice', async ({ page }) => {
  const admin = new AdminPage(page);
  await new LoginPage(page).ingresarYEsperar(SEED.jugador);

  await admin.abrir();

  await expect(admin.accesoDenegado).toBeVisible();
  await expect(page).toHaveURL('/unauthorized');
});

test('sin sesión, el backoffice manda al login', async ({ page }) => {
  await new AdminPage(page).abrir();

  await expect(page).toHaveURL(/\/auth\/login/);
});

test('soporte entra al backoffice y ve solo sus secciones', async ({ page, admin }) => {
  const soporte = await admin.crearUsuario('soporte', [ROL.SOPORTE]);
  const backoffice = new AdminPage(page);

  await new LoginPage(page).ingresarYEsperar(soporte.username);

  await expect(page).toHaveURL('/admin');
  for (const seccion of ['Usuarios', 'Cancelaciones', 'Reclamos', 'Alertas', 'Auditoría']) {
    await expect(backoffice.seccion(seccion)).toBeVisible();
  }
  for (const seccion of ['Roles', 'Personas']) {
    await expect(backoffice.seccion(seccion)).toHaveCount(0);
  }
});

test('soporte no entra a una sección que no le corresponde aunque escriba la URL', async ({
  page,
  admin,
}) => {
  const soporte = await admin.crearUsuario('soporte', [ROL.SOPORTE]);
  const backoffice = new AdminPage(page);
  await new LoginPage(page).ingresarYEsperar(soporte.username);

  await backoffice.abrir('/admin/roles');

  await expect(backoffice.accesoDenegado).toBeVisible();
});
