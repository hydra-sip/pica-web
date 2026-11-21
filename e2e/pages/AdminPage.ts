import { Locator, Page } from '@playwright/test';

/** El backoffice: la navegación por permisos, la página de acceso denegado y las cancelaciones en revisión. */
export class AdminPage {
  readonly accesoDenegado: Locator;
  readonly aviso: Locator;

  constructor(private readonly page: Page) {
    this.accesoDenegado = page.getByRole('heading', { name: 'Acceso Denegado' });
    this.aviso = page.getByRole('main').getByRole('status');
  }

  async abrir(ruta = '/admin') {
    await this.page.goto(ruta);
  }

  /** El enlace puede llevar un contador ("Alertas 2 pendientes"): se busca por cómo empieza. */
  seccion(texto: string) {
    return this.page
      .getByRole('navigation', { name: 'Navegación principal' })
      .getByRole('link', { name: new RegExp(`^${texto}(\\s|$)`) });
  }

  async aprobarGastosDe(torneo: string) {
    await this.abrir('/admin/cancelaciones');
    await this.page.getByRole('button', { name: `Revisar ${torneo}` }).click();
    await this.page
      .getByRole('region', { name: `Cancelación de ${torneo}` })
      .getByRole('button', { name: 'Aprobar gastos' })
      .click();
    await this.page
      .getByRole('dialog', { name: `Aprobar los gastos de ${torneo}` })
      .getByRole('button', { name: 'Aprobar', exact: true })
      .click();
  }
}
