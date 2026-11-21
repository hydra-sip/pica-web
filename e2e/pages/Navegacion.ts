import { Locator, Page } from '@playwright/test';

/** La barra lateral: lo que muestra depende de los permisos de la sesión. */
export class Navegacion {
  readonly nav: Locator;
  readonly cerrarSesion: Locator;

  constructor(page: Page) {
    this.nav = page.getByRole('navigation', { name: 'Navegación principal' });
    this.cerrarSesion = page.getByRole('button', { name: 'Cerrar sesión' }).first();
  }

  enlace(texto: string) {
    return this.nav.getByRole('link', { name: texto, exact: true });
  }
}
