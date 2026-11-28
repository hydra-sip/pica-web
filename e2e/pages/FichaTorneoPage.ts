import { Locator, Page } from '@playwright/test';

/** La ficha pública del torneo y los dos pasos de la inscripción individual (reglamento y pago). */
export class FichaTorneoPage {
  readonly inscribirme: Locator;
  readonly aceptoReglamento: Locator;
  readonly continuarAlPago: Locator;
  readonly pagarConSaldo: Locator;
  readonly confirmada: Locator;
  readonly resumenSaldo: Locator;

  constructor(private readonly page: Page) {
    this.inscribirme = page.getByRole('button', { name: 'Inscribirme al Torneo' });
    this.aceptoReglamento = page.getByRole('checkbox', {
      name: 'Acepto el Reglamento y Código de Conducta',
    });
    this.continuarAlPago = page.getByRole('button', { name: /Continuar al pago/ });
    this.pagarConSaldo = page.getByRole('button', { name: /Pagar .* con saldo/ });
    this.confirmada = page.getByRole('heading', { name: '¡Inscripción confirmada!' });
    this.resumenSaldo = page.getByRole('main').getByRole('status');
  }

  async abrir(slug: string) {
    await this.page.goto(`/torneos/${slug}`);
  }

  async inscribirmePagandoConSaldo() {
    await this.inscribirme.click();
    await this.aceptoReglamento.check();
    await this.continuarAlPago.click();
    await this.pagarConSaldo.click();
  }
}
