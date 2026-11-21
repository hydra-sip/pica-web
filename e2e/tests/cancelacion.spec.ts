import { AdminPage } from '../pages/AdminPage';
import { BilleteraPage } from '../pages/BilleteraPage';
import { ConsolaTorneoPage } from '../pages/ConsolaTorneoPage';
import { ROL, SEED } from '../support/api';
import { inscribirYPagar, jugadorConSaldo, torneoPublicado } from '../support/datos';
import { pesos } from '../support/formato';
import { expect, test } from '../support/test';

// Un PNG de 1×1: el back mira el contenido, no la extensión
const COMPROBANTE = {
  name: 'factura.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  ),
};

// Flujo crítico 4 (HU-605): el organizador cancela declarando un gasto, soporte lo aprueba y el inscripto recibe
// lo que pagó menos su parte del gasto.
test('al aprobar los gastos de una cancelación el inscripto recibe el reintegro menos el gasto', async ({
  admin,
  organizador,
  request,
  sesionDe,
}) => {
  const torneo = await torneoPublicado(organizador);
  const inscripto = await jugadorConSaldo(admin, request, 'reintegro', 5000);
  await inscribirYPagar(inscripto, torneo.id);
  const soporte = await admin.crearUsuario('soporte', [ROL.SOPORTE]);

  const consola = new ConsolaTorneoPage(await sesionDe(SEED.organizador));
  await consola.abrir(torneo.id);
  await consola.cancelarConGastos('Se inundó la cancha', [
    { concepto: 'Alquiler de la cancha', monto: 100, comprobante: COMPROBANTE },
  ]);
  await expect(consola.estado).toContainText('Cancelación enviada a revisión de soporte');

  const backoffice = new AdminPage(await sesionDe(soporte.username));
  await backoffice.aprobarGastosDe(torneo.nombre);
  await expect(backoffice.aviso).toContainText(`Se aprobaron los gastos de ${torneo.nombre}`);

  // Pagó $ 1.100 y es el único inscripto: se le retiene todo el gasto ($ 100) y vuelven $ 1.000
  const billetera = new BilleteraPage(await sesionDe(inscripto.username));
  await billetera.abrir();
  await billetera.esperarSaldo('Disponible', 4900);
  await billetera.esperarSaldo('Retenido (en custodia)', 0);
  await expect(billetera.movimiento('Reintegro', torneo.nombre)).toContainText(pesos(1000));
});
