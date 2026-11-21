import { Locator, Page } from '@playwright/test';

export interface Gasto {
  concepto: string;
  monto: number;
  comprobante: { name: string; mimeType: string; buffer: Buffer };
}

/** La consola del organizador; acá, la cancelación con gastos (HU-605). */
export class ConsolaTorneoPage {
  readonly cancelarTorneo: Locator;
  readonly dialogo: Locator;
  readonly estado: Locator;

  constructor(private readonly page: Page) {
    this.cancelarTorneo = page.getByRole('button', { name: 'Cancelar torneo' });
    this.dialogo = page.getByRole('dialog', { name: '¿Cancelar el torneo y devolver la plata?' });
    this.estado = page.getByRole('main').getByRole('status').first();
  }

  async abrir(id: number) {
    await this.page.goto(`/torneos/${id}/consola`);
  }

  async cancelarConGastos(motivo: string, gastos: Gasto[]) {
    await this.cancelarTorneo.click();
    await this.dialogo
      .getByLabel('Motivo de la cancelación (lo ven los participantes)')
      .fill(motivo);
    for (const [i, gasto] of gastos.entries()) {
      await this.dialogo.getByRole('button', { name: 'Agregar gasto' }).click();
      await this.dialogo.getByLabel(`Concepto del gasto ${i + 1}`).fill(gasto.concepto);
      await this.dialogo.getByLabel(`Monto del gasto ${i + 1} ($)`).fill(String(gasto.monto));
      await this.dialogo
        .getByLabel(`Comprobante del gasto ${i + 1}`)
        .setInputFiles(gasto.comprobante);
    }
    await this.dialogo.getByRole('checkbox', { name: /Confirmo la cancelación/ }).check();
    await this.dialogo.getByRole('button', { name: 'Enviar a revisión de soporte' }).click();
  }
}
