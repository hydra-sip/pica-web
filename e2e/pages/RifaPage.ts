import { Locator, Page } from '@playwright/test';

/** La rifa pública: la grilla de números y el diálogo de pago. */
export class RifaPage {
  readonly comprar: Locator;
  readonly pago: Locator;
  readonly pagarConSaldo: Locator;
  readonly grilla: Locator;

  constructor(private readonly page: Page) {
    this.comprar = page.getByRole('button', { name: 'Comprar' });
    this.pago = page.getByRole('dialog', { name: 'Confirmar y pagar' });
    this.pagarConSaldo = this.pago.getByRole('button', { name: /Pagar .* con saldo/ });
    this.grilla = page.getByRole('region', { name: 'Elegí tus números' });
  }

  async abrir(id: number) {
    await this.page.goto(`/rifas/${id}`);
  }

  numero(n: number) {
    return this.grilla.getByRole('button', { name: new RegExp(`^${n}:`) });
  }

  async comprarConSaldo(...numeros: number[]) {
    for (const n of numeros) await this.numero(n).click();
    await this.comprar.click();
    await this.pagarConSaldo.click();
  }
}
