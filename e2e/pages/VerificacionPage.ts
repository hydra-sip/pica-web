import { Locator, Page } from '@playwright/test';

/** El portal público de verificación de sorteos (HU-505). */
export class VerificacionPage {
  readonly idRifa: Locator;
  readonly consultar: Locator;
  readonly recalcular: Locator;
  readonly simularAlteracion: Locator;
  readonly alterarSemilla: Locator;
  readonly veredicto: Locator;
  readonly ganadores: Locator;

  constructor(private readonly page: Page) {
    const main = page.getByRole('main');
    this.idRifa = main.getByLabel('O ingresar ID de Rifa');
    this.consultar = main.getByRole('button', { name: 'Consultar' });
    this.recalcular = main.getByRole('button', { name: 'Recalcular y Verificar' });
    this.simularAlteracion = main.getByRole('button', { name: 'Simular Alteración' });
    this.alterarSemilla = main.getByRole('button', { name: 'Alterar semilla' });
    // El resultado de recalcular es el único h4 que no es el título del modo simulación
    this.veredicto = main
      .getByRole('heading', { level: 4 })
      .filter({ hasNotText: 'Modo Simulación' });
    this.ganadores = main.getByRole('table');
  }

  async abrirRifa(id: number) {
    await this.page.goto('/verificacion');
    await this.page.getByRole('button', { name: 'Sorteo de Rifa' }).click();
    await this.idRifa.fill(String(id));
    await this.consultar.click();
  }
}
