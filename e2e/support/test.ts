import { test as base } from '@playwright/test';
import { Api, SEED } from './api';

/** `test` con la API logueada como admin, para armar los datos de cada test. */
export const test = base.extend<{ admin: Api }>({
  admin: async ({ request }, use) => {
    await use(await Api.login(request, SEED.admin));
  },
});

export { expect } from '@playwright/test';
