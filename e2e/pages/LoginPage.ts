import { Locator, Page, expect } from '@playwright/test';
import { CLAVE_SEED } from '../support/api';

export class LoginPage {
  readonly usuario: Locator;
  readonly clave: Locator;
  readonly ingresar: Locator;
  readonly error: Locator;

  constructor(private readonly page: Page) {
    this.usuario = page.getByLabel('Usuario o email');
    this.clave = page.getByLabel('Contraseña', { exact: true });
    this.ingresar = page.getByRole('button', { name: 'Ingresar' });
    this.error = page.getByRole('alert');
  }

  async abrir() {
    await this.page.goto('/auth/login');
  }

  async ingresarComo(usuario: string, clave = CLAVE_SEED) {
    await this.abrir();
    await this.usuario.fill(usuario);
    await this.clave.fill(clave);
    await this.ingresar.click();
  }

  /** Entra y espera a que la app lo lleve fuera del login. */
  async ingresarYEsperar(usuario: string, clave = CLAVE_SEED) {
    await this.ingresarComo(usuario, clave);
    await expect(this.page).not.toHaveURL(/\/auth\/login/);
  }
}
