import { LoginPage } from '../pages/LoginPage';
import { Navegacion } from '../pages/Navegacion';
import { ROL, SEED } from '../support/api';
import { expect, test } from '../support/test';

/** Cada rol entra y ve lo suyo: la navegación se arma con los permisos del token (PICA-437). */
const ROLES_DEL_SEED = [
  { rol: 'participante', usuario: SEED.jugador, ve: 'Billetera', noVe: 'Mis torneos' },
  { rol: 'organizador', usuario: SEED.organizador, ve: 'Mis torneos', noVe: 'Backoffice' },
  { rol: 'árbitro', usuario: SEED.arbitro, ve: 'Designaciones', noVe: 'Mis torneos' },
];

for (const { rol, usuario, ve, noVe } of ROLES_DEL_SEED) {
  test(`el ${rol} entra al sitio y ve "${ve}" pero no "${noVe}"`, async ({ page }) => {
    const login = new LoginPage(page);
    const nav = new Navegacion(page);

    await login.ingresarYEsperar(usuario);

    await expect(page).toHaveURL('/');
    await expect(nav.enlace(ve)).toBeVisible();
    await expect(nav.enlace(noVe)).toHaveCount(0);
  });
}

const ROLES_DEL_BACKOFFICE = [
  { rol: 'administrador', roles: [ROL.ADMINISTRADOR] },
  { rol: 'soporte', roles: [ROL.SOPORTE] },
];

for (const { rol, roles } of ROLES_DEL_BACKOFFICE) {
  test(`el usuario de ${rol} entra directo al backoffice`, async ({ page, admin }) => {
    const usuario = await admin.crearUsuario(rol, roles);
    const login = new LoginPage(page);

    await login.ingresarYEsperar(usuario.username);

    await expect(page).toHaveURL('/admin');
    await expect(page.getByRole('link', { name: 'Usuarios', exact: true })).toBeVisible();
  });
}

test('el admin del sistema entra directo al backoffice', async ({ page }) => {
  const login = new LoginPage(page);

  await login.ingresarYEsperar(SEED.admin);

  await expect(page).toHaveURL('/admin');
});

test('con la contraseña equivocada no entra y lo avisa', async ({ page }) => {
  const login = new LoginPage(page);

  await login.ingresarComo(SEED.jugador, 'NoEsLaClave1!');

  await expect(login.error).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/login/);
});

test('al cerrar sesión vuelve a ver "Ingresar"', async ({ page }) => {
  const login = new LoginPage(page);
  const nav = new Navegacion(page);
  await login.ingresarYEsperar(SEED.jugador);

  await nav.cerrarSesion.click();

  await expect(nav.enlace('Ingresar')).toBeVisible();
  await expect(nav.enlace('Billetera')).toHaveCount(0);
});
