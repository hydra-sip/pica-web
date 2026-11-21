import { RifaPage } from '../pages/RifaPage';
import { VerificacionPage } from '../pages/VerificacionPage';
import { cerrarYSortear, jugadorConSaldo, rifaEnVenta } from '../support/datos';
import { expect, test } from '../support/test';

// Flujo crítico 3 (HU-403, HU-504 y HU-505): comprar un número, sortear con la semilla de drand y verificar el
// sorteo en el portal público, que tiene que detectar una semilla alterada.
test('el número comprado se sortea y el portal verifica el sorteo y detecta una semilla alterada', async ({
  admin,
  organizador,
  request,
  sesionDe,
  page,
}) => {
  const rifa = await rifaEnVenta(organizador);
  const comprador = await jugadorConSaldo(admin, request, 'comprador');
  const rifaPage = new RifaPage(await sesionDe(comprador.username));

  await rifaPage.abrir(rifa.id);
  await rifaPage.comprarConSaldo(7);
  await expect(rifaPage.grilla.getByText('Vendidos (1)')).toBeVisible();

  await cerrarYSortear(organizador, request, rifa.id);
  // El portal es público: lo abre alguien sin sesión
  const portal = new VerificacionPage(page);
  await portal.abrirRifa(rifa.id);
  await portal.recalcular.click();

  await expect(portal.veredicto).toHaveText('Rifa 100% Verificada Criptográficamente');
  await expect(portal.ganadores.getByRole('row', { name: /Número 7/ })).toContainText('Coincide');

  await portal.simularAlteracion.click();
  await portal.alterarSemilla.click();
  await portal.recalcular.click();

  await expect(portal.veredicto).toHaveText('Discrepancia Detectada (Manipulación Evidenciada)');
});
