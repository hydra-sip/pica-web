import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { InscripcionResumen } from '../api/inscripcionApi';
import type { ReprogramacionDetalle } from '../api/torneoApi';
import { server } from '../mocks/server';
import { renderRuta } from '../test/renderRuta';

const RUTA = '/mis-inscripciones';

const fila = (cambios: Partial<InscripcionResumen> = {}): InscripcionResumen => ({
  id: 4,
  torneoId: 9,
  torneo: { id: 9, nombre: 'Copa Lluvia', slug: 'copa-lluvia', estado: 'INSCRIPCION_CERRADA' },
  usuarioId: null,
  estado: 'CONFIRMADA',
  creadoEn: '2026-11-01T12:00:00Z',
  modificadoEn: '2026-11-01T12:00:00Z',
  equipo: { id: 10, nombre: 'Los Mojados', capitanId: 2 },
  rol: 'CAPITAN',
  ...cambios,
});

const reprogramacion = (cambios: Partial<ReprogramacionDetalle> = {}): ReprogramacionDetalle => ({
  id: 1,
  fechaInicioAnterior: '2026-12-01T15:00:00Z',
  fechaFinAnterior: null,
  fechaInicioNueva: '2026-12-15T15:00:00Z',
  fechaFinNueva: null,
  cierreInscripcion: '2026-12-10T12:00:00Z',
  rechazoHasta: '2026-12-05T12:00:00Z',
  motivo: 'Lluvia',
  plazoAbierto: true,
  rechazos: 0,
  creadaEn: '2026-11-26T12:00:00Z',
  ...cambios,
});

/** Mis inscripciones con esta fila y el torneo 9 con este historial; el comprobante, $20.000 de inscripción. */
const conNuevaFecha = (inscripcion: InscripcionResumen, historial: ReprogramacionDetalle[]) =>
  server.use(
    http.get('*/inscripciones/mias', () =>
      HttpResponse.json({
        content: [inscripcion],
        page: { size: 100, number: 0, totalElements: 1, totalPages: 1 },
      })
    ),
    http.get('*/torneos/9/reprogramaciones', () => HttpResponse.json(historial)),
    http.get('*/inscripciones/4/comprobante', () =>
      HttpResponse.json({ numero: 'I9-55', monto: 20000, gastosAdministrativos: 2000, total: 22000 })
    )
  );

describe('Aviso de la nueva fecha y rechazo (CR-01-6)', () => {
  it('el capitán ve la nueva fecha y se baja: vuelve la inscripción y la fila queda reintegrada', async () => {
    let rechazos = 0;
    conNuevaFecha(fila(), [reprogramacion()]);
    server.use(
      http.post('*/inscripciones/4/rechazo-reprogramacion', () => {
        rechazos++;
        return HttpResponse.json({ inscripcionId: 4, torneoId: 9, estado: 'REINTEGRADA', reintegrado: 20000 });
      })
    );
    const { user } = await renderRuta(RUTA);

    const item = await screen.findByRole('listitem', { name: /Copa Lluvia/ });
    expect(await within(item).findByText(/Copa Lluvia cambió de fecha/)).toBeInTheDocument();
    expect(within(item).getByText(/Motivo: Lluvia/)).toBeInTheDocument();
    await user.click(within(item).getByRole('button', { name: 'La nueva fecha no me sirve' }));

    const modal = await screen.findByRole('dialog', { name: '¿Bajarte del torneo?' });
    expect(await within(modal).findByText('$ 20.000,00')).toBeInTheDocument();
    expect(within(modal).getByText(/Los gastos administrativos no se devuelven/)).toBeInTheDocument();
    expect(within(modal).getByText(/El equipo pierde el lugar/)).toBeInTheDocument();
    await user.click(within(modal).getByRole('button', { name: 'Sí, me bajo' }));

    expect(await screen.findByText(/volvieron \$ 20\.000,00 a tu billetera/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver en Mi billetera' })).toHaveAttribute('href', '/billetera');
    expect(within(item).getByText('Reintegrada')).toBeInTheDocument();
    expect(within(item).queryByText(/cambió de fecha/)).not.toBeInTheDocument();
    expect(rechazos).toBe(1);
  });

  it('un jugador que no es el capitán ve el aviso, pero no el botón', async () => {
    conNuevaFecha(fila({ rol: 'JUGADOR' }), [reprogramacion()]);

    await renderRuta(RUTA);

    const item = await screen.findByRole('listitem', { name: /Copa Lluvia/ });
    expect(
      await within(item).findByText(/el capitán puede bajar al equipo hasta el/)
    ).toBeInTheDocument();
    expect(
      within(item).queryByRole('button', { name: 'La nueva fecha no me sirve' })
    ).not.toBeInTheDocument();
  });

  it('con el plazo vencido no hay aviso', async () => {
    conNuevaFecha(fila(), [reprogramacion({ plazoAbierto: false })]);

    await renderRuta(RUTA);

    const item = await screen.findByRole('listitem', { name: /Copa Lluvia/ });
    expect(within(item).getByText('Confirmada')).toBeInTheDocument();
    expect(within(item).queryByText(/cambió de fecha/)).not.toBeInTheDocument();
  });

  it('si el plazo vence mientras decide, el diálogo lo dice y sigue inscripto', async () => {
    conNuevaFecha(fila({ rol: 'INDIVIDUAL', equipo: null }), [reprogramacion()]);
    server.use(
      http.post('*/inscripciones/4/rechazo-reprogramacion', () =>
        HttpResponse.json(
          { status: 409, codigo: 'PLAZO_RECHAZO_VENCIDO', detail: 'Sin plazo abierto' },
          { status: 409, headers: { 'Content-Type': 'application/problem+json' } }
        )
      )
    );
    const { user } = await renderRuta(RUTA);

    const item = await screen.findByRole('listitem', { name: /Copa Lluvia/ });
    await user.click(await within(item).findByRole('button', { name: 'La nueva fecha no me sirve' }));
    const modal = await screen.findByRole('dialog');
    expect(within(modal).getByText(/Perdés el lugar en el torneo/)).toBeInTheDocument();
    await user.click(within(modal).getByRole('button', { name: 'Sí, me bajo' }));

    expect(
      await within(modal).findByText('Ya venció el plazo para bajarse por la nueva fecha: seguís inscripto.')
    ).toBeInTheDocument();
    expect(within(item).getByText('Confirmada')).toBeInTheDocument();
  });
});
