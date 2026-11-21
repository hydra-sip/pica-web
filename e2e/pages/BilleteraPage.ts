import { Locator, Page, expect } from '@playwright/test';
import { pesos } from '../support/formato';

export type Saldo = 'Disponible' | 'Retenido (en custodia)' | 'Ganancia acumulada';

export class BilleteraPage {
  readonly indicadores: Locator;
  readonly movimientos: Locator;

  constructor(private readonly page: Page) {
    this.indicadores = page.getByRole('region', { name: 'Indicadores de saldo' });
    this.movimientos = page
      .getByRole('region', { name: 'Historial de movimientos' })
      .getByRole('row');
  }

  async abrir() {
    await this.page.goto('/billetera');
  }

  /** Cada tarjeta es el nombre del saldo seguido del monto. */
  async esperarSaldo(saldo: Saldo, monto: number) {
    const nombre = saldo.replace(/[()]/g, '\\$&');
    await expect(this.indicadores).toContainText(new RegExp(`${nombre}\\s*${pesos(monto).source}`));
  }

  /**
   * Para lo que hace un job del back (la liquidación): recarga hasta que aparece. La pantalla no se actualiza sola.
   */
  async esperarSaldoRecargando(saldo: Saldo, monto: number) {
    await expect(async () => {
      await this.abrir();
      await this.esperarSaldo(saldo, monto);
    }).toPass({ timeout: 30_000 });
  }

  movimiento(tipo: string, detalle: string) {
    return this.movimientos.filter({ hasText: tipo }).filter({ hasText: detalle });
  }
}
