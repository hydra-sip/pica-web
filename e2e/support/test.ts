import { Page, test as base } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { Api, SEED } from './api';

interface Fixtures {
  /** La API como admin, para crear usuarios. */
  admin: Api;
  /** La API como dev_organizador, para armar torneos y rifas. */
  organizador: Api;
  /** La API como dev_arbitro, para aceptar designaciones. */
  arbitro: Api;
  /** Una pestaña con la sesión de otro usuario, en su propio contexto (no comparte el localStorage). */
  sesionDe: (usuario: string) => Promise<Page>;
}

export const test = base.extend<Fixtures>({
  admin: async ({ request }, use) => {
    await use(await Api.login(request, SEED.admin));
  },
  organizador: async ({ request }, use) => {
    await use(await Api.login(request, SEED.organizador));
  },
  arbitro: async ({ request }, use) => {
    await use(await Api.login(request, SEED.arbitro));
  },
  sesionDe: async ({ browser }, use) => {
    const contextos: Awaited<ReturnType<typeof browser.newContext>>[] = [];
    await use(async (usuario) => {
      const contexto = await browser.newContext();
      contextos.push(contexto);
      const page = await contexto.newPage();
      await new LoginPage(page).ingresarYEsperar(usuario);
      return page;
    });
    for (const contexto of contextos) await contexto.close();
  },
});

export { expect } from '@playwright/test';
