import { BilleteraPage } from '../pages/BilleteraPage';
import { FichaTorneoPage } from '../pages/FichaTorneoPage';
import { jugadorConSaldo, torneoPublicado } from '../support/datos';
import { pesos } from '../support/formato';
import { expect, test } from '../support/test';

// Flujo crítico 1 (HU-603): inscribirse pagando con el saldo de la billetera; la plata queda en custodia.
test('inscribirse a un torneo pagando con saldo deja el total retenido en custodia', async ({
  admin,
  organizador,
  request,
  sesionDe,
}) => {
  const torneo = await torneoPublicado(organizador);
  const jugador = await jugadorConSaldo(admin, request, 'inscripto', 5000);
  const page = await sesionDe(jugador.username);
  const ficha = new FichaTorneoPage(page);
  const billetera = new BilleteraPage(page);

  await ficha.abrir(torneo.slug);
  await ficha.inscribirmePagandoConSaldo();

  // $ 1.000 de inscripción más $ 100 de gastos administrativos
  await expect(ficha.confirmada).toBeVisible();
  await expect(ficha.resumenSaldo).toContainText(pesos(3900));
  await expect(ficha.resumenSaldo).toContainText(pesos(1100));
  await billetera.abrir();
  await billetera.esperarSaldo('Disponible', 3900);
  await billetera.esperarSaldo('Retenido (en custodia)', 1100);
  await expect(billetera.movimiento('Inscripción', torneo.nombre)).toContainText(pesos(1000));
});

test('sin saldo suficiente avisa cuánto falta y no deja pagar', async ({
  admin,
  organizador,
  request,
  sesionDe,
}) => {
  const torneo = await torneoPublicado(organizador);
  const jugador = await jugadorConSaldo(admin, request, 'sinsaldo', 500);
  const page = await sesionDe(jugador.username);
  const ficha = new FichaTorneoPage(page);

  await ficha.abrir(torneo.slug);
  await ficha.inscribirme.click();
  await ficha.aceptoReglamento.check();
  await ficha.continuarAlPago.click();

  await expect(page.getByRole('region', { name: 'Método de pago' })).toContainText(
    /Te faltan\s*\$\s600,00/
  );
  await expect(ficha.pagarConSaldo).toBeDisabled();
});
