import { BilleteraPage } from '../pages/BilleteraPage';
import { PartidoPage } from '../pages/PartidoPage';
import { inscribirYPagar, jugadorConSaldo, sortearFinal, torneoPublicado } from '../support/datos';
import { pesos } from '../support/formato';
import { expect, test } from '../support/test';

// Flujo crítico 2 (HU-301 y HU-606): el resultado lo carga un capitán y lo acepta el rival; al confirmarse la final
// el torneo termina y la liquidación (un job del back) le paga el premio al campeón.
test('un torneo de punta a punta termina con el premio en la billetera del campeón', async ({
  admin,
  organizador,
  arbitro,
  request,
  sesionDe,
}) => {
  const torneo = await torneoPublicado(organizador, { cupo: 2, conArbitro: true, arbitro });
  const campeon = await jugadorConSaldo(admin, request, 'campeon');
  const rival = await jugadorConSaldo(admin, request, 'rival');
  await inscribirYPagar(campeon, torneo.id);
  await inscribirYPagar(rival, torneo.id);
  const final = await sortearFinal(organizador, torneo.id);
  // En la llave cada lado se llama como la persona: "Prueba campeon" y "Prueba rival"
  const lados = [final.local.nombre, final.visitante.nombre];
  const ladoCampeon = lados.find((nombre) => nombre.endsWith('campeon'))!;
  const ladoRival = lados.find((nombre) => nombre.endsWith('rival'))!;

  const paginaCampeon = await sesionDe(campeon.username);
  const partidoCampeon = new PartidoPage(paginaCampeon);
  await partidoCampeon.abrir(final.id);
  await partidoCampeon.cargarResultado({ [ladoCampeon]: 3, [ladoRival]: 1 });
  await expect(partidoCampeon.estado.first()).toContainText('Ahora lo tiene que aceptar el rival');

  const partidoRival = new PartidoPage(await sesionDe(rival.username));
  await partidoRival.abrir(final.id);
  await partidoRival.aceptarResultado.click();
  await expect(partidoRival.estado).toContainText('el cruce quedó cerrado');

  // Pozo de $ 2.000 (dos inscripciones de $ 1.000), todo al 1.º puesto
  const billetera = new BilleteraPage(paginaCampeon);
  await billetera.esperarSaldoRecargando('Ganancia acumulada', 2000);
  await billetera.esperarSaldo('Retenido (en custodia)', 0);
  await expect(billetera.movimiento('Premio', torneo.nombre)).toContainText(pesos(2000));
});
