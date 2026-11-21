import { Locator, Page } from '@playwright/test';

/** La ficha del partido: el capitán de un lado carga el resultado y el del otro lo acepta u objeta. */
export class PartidoPage {
  readonly enviarResultado: Locator;
  readonly aceptarResultado: Locator;
  readonly estado: Locator;

  constructor(private readonly page: Page) {
    this.enviarResultado = page.getByRole('button', { name: 'Confirmar y enviar resultado' });
    this.aceptarResultado = page.getByRole('button', { name: 'Aceptar marcador y cerrar cruce' });
    this.estado = page.getByRole('main').getByRole('status');
  }

  async abrir(id: number) {
    await this.page.goto(`/partidos/${id}`);
  }

  /** Los puntajes se cargan en el campo que lleva el nombre de cada lado. */
  async cargarResultado(puntajes: Record<string, number>) {
    for (const [lado, puntaje] of Object.entries(puntajes)) {
      await this.page.getByRole('spinbutton', { name: lado, exact: true }).fill(String(puntaje));
    }
    await this.enviarResultado.click();
  }
}
