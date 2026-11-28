import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { EstadoTorneo, ReprogramacionDetalle, ReprogramacionPayload } from '../api/torneoApi';
import { prepararTorneoACancelar, TORNEO_A_CANCELAR } from '../mocks/cancelacionHandlers';
import { server } from '../mocks/server';
import type { UseTorneoRealtimeOptions } from '../realtime/useTorneoRealtime';
import { renderRuta } from '../test/renderRuta';
import { HistorialReprogramaciones } from './components/HistorialReprogramaciones';

// el canal del torneo, a mano: el test manda los mensajes que mandaría el back
const enVivo = vi.hoisted(() => ({ opciones: null as UseTorneoRealtimeOptions | null }));
vi.mock('../realtime/useTorneoRealtime', () => ({
  useTorneoRealtime: (_torneoId: unknown, opciones: UseTorneoRealtimeOptions) => {
    enVivo.opciones = opciones;
  },
}));

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

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
  rechazos: 1,
  creadaEn: '2026-11-26T12:00:00Z',
  ...cambios,
});

/** La consola del torneo 7 como su organizador, con 3 confirmadas y el historial que se le pase. */
const consola = (estado: EstadoTorneo, historial: ReprogramacionDetalle[] = []) => {
  prepararTorneoACancelar(estado);
  server.use(
    http.get(`${API_URL}/torneos/opciones`, () => HttpResponse.json({ checkinDuracionMaxMin: 60 })),
    http.get(`${API_URL}/rifas/mis-rifas`, () =>
      HttpResponse.json({ content: [], page: { size: 100, number: 0, totalElements: 0, totalPages: 0 } })
    ),
    http.get(`${API_URL}/torneos/${TORNEO_A_CANCELAR}/inscripciones`, () =>
      HttpResponse.json({ content: [], page: { size: 1, number: 0, totalElements: 3, totalPages: 3 } })
    ),
    http.get(`${API_URL}/torneos/${TORNEO_A_CANCELAR}/reprogramaciones`, () => HttpResponse.json(historial))
  );
  return renderRuta(`/torneos/${TORNEO_A_CANCELAR}/consola`, { usuario: 'organizador' });
};

const completar = (modal: HTMLElement, campo: RegExp, valor: string) =>
  fireEvent.change(within(modal).getByLabelText(campo), { target: { value: valor } });

describe('Reprogramar un torneo desde la consola (CR-01-5)', () => {
  it('con la inscripción cerrada se reprograma y la consola lo muestra', async () => {
    const enviados: ReprogramacionPayload[] = [];
    server.use(
      http.post(`${API_URL}/torneos/${TORNEO_A_CANCELAR}/reprogramaciones`, async ({ request }) => {
        enviados.push((await request.json()) as ReprogramacionPayload);
        return HttpResponse.json(reprogramacion(), { status: 201 });
      })
    );
    const { user } = await consola('INSCRIPCION_CERRADA');

    await user.click(await screen.findByRole('button', { name: 'Reprogramar' }));
    const modal = await screen.findByRole('dialog', { name: 'Reprogramar el torneo' });
    const confirmar = within(modal).getByRole('button', { name: 'Reprogramar y avisar' });

    expect(confirmar).toBeDisabled();
    completar(modal, /Nueva fecha de inicio/, '2026-12-15T12:00');
    completar(modal, /Plazo para bajarse/, '2026-12-05T09:00');
    completar(modal, /Nuevo cierre de inscripción/, '2026-12-10T09:00');
    await user.type(within(modal).getByLabelText(/Motivo/), 'Lluvia');
    expect(confirmar).toBeEnabled();
    await user.click(confirmar);

    expect(
      await screen.findByText(/Torneo reprogramado: avisamos a los inscriptos/)
    ).toBeInTheDocument();
    expect(enviados).toHaveLength(1);
    expect(enviados[0].motivo).toBe('Lluvia');
    expect(enviados[0].fechaInicio).toBe(new Date('2026-12-15T12:00').toISOString());
    expect(enviados[0].rechazoHasta).toBe(new Date('2026-12-05T09:00').toISOString());
    expect(enviados[0].fechaFin).toBeNull();
  });

  it('el resumen dice a cuántos se avisa, que la plata sigue en custodia y qué pasa con la inscripción', async () => {
    const { user } = await consola('INSCRIPCION_CERRADA');

    await user.click(await screen.findByRole('button', { name: 'Reprogramar' }));
    const modal = await screen.findByRole('dialog');

    expect(
      await within(modal).findByText(/Avisamos a 3 inscripciones confirmadas/)
    ).toBeInTheDocument();
    expect(within(modal).getByText(/La plata sigue en custodia/)).toBeInTheDocument();
    expect(
      within(modal).getByText(/La inscripción queda cerrada mientras corre el plazo/)
    ).toBeInTheDocument();
  });

  it('los errores del back aparecen junto a su campo', async () => {
    server.use(
      http.post(`${API_URL}/torneos/${TORNEO_A_CANCELAR}/reprogramaciones`, () =>
        HttpResponse.json(
          {
            status: 400,
            codigo: 'VALIDACION',
            detail: 'Hay campos inválidos',
            errores: [
              {
                campo: 'cierreInscripcion',
                codigo: 'FECHAS_INVALIDAS',
                mensaje: 'La inscripción tiene que cerrar después del plazo para rechazar la nueva fecha',
              },
            ],
          },
          { status: 400, headers: { 'Content-Type': 'application/problem+json' } }
        )
      )
    );
    const { user } = await consola('INSCRIPCION_ABIERTA');

    await user.click(await screen.findByRole('button', { name: 'Reprogramar' }));
    const modal = await screen.findByRole('dialog');
    completar(modal, /Nueva fecha de inicio/, '2026-12-15T12:00');
    completar(modal, /Plazo para bajarse/, '2026-12-05T09:00');
    completar(modal, /Nuevo cierre de inscripción/, '2026-12-04T09:00');
    await user.type(within(modal).getByLabelText(/Motivo/), 'Lluvia');
    await user.click(within(modal).getByRole('button', { name: 'Reprogramar y avisar' }));

    expect(
      await within(modal).findByText(
        'La inscripción tiene que cerrar después del plazo para rechazar la nueva fecha.'
      )
    ).toBeInTheDocument();
  });

  it('con el plazo abierto se ve cuántos se bajaron y no se puede volver a reprogramar', async () => {
    await consola('INSCRIPCION_CERRADA', [reprogramacion({ rechazos: 1 })]);

    expect(await screen.findByText('Cambios de fecha')).toBeInTheDocument();
    expect(screen.getByText(/Se bajó 1 inscripción/)).toBeInTheDocument();
    expect(screen.getByText(/Motivo: Lluvia/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reprogramar' })).not.toBeInTheDocument();
  });

  it('cuando alguien se baja, la consola se actualiza sola con el mensaje en vivo', async () => {
    await consola('INSCRIPCION_CERRADA', [reprogramacion({ rechazos: 0 })]);
    expect(await screen.findByText(/Nadie se bajó todavía/)).toBeInTheDocument();
    server.use(
      http.get(`${API_URL}/torneos/${TORNEO_A_CANCELAR}/reprogramaciones`, () =>
        HttpResponse.json([reprogramacion({ rechazos: 1 })])
      )
    );

    await act(async () => enVivo.opciones?.onActualizar?.({ tipo: 'INSCRIPCION_REINTEGRADA' }));

    expect(await screen.findByText(/Se bajó 1 inscripción/)).toBeInTheDocument();
  });

  it('un torneo finalizado no se reprograma', async () => {
    await consola('FINALIZADO');

    expect(await screen.findByText(/Consola del torneo/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reprogramar' })).not.toBeInTheDocument();
  });
});

describe('Historial de reprogramaciones en la ficha (CR-01-5)', () => {
  it('muestra el cambio y el plazo, sin cuántos se bajaron', () => {
    render(<HistorialReprogramaciones reprogramaciones={[reprogramacion({ rechazos: 2 })]} />);

    expect(screen.getByText('Cambios de fecha')).toBeInTheDocument();
    expect(screen.getByText(/Los inscriptos pueden bajarse hasta el/)).toBeInTheDocument();
    expect(screen.queryByText(/Se bajaron/)).not.toBeInTheDocument();
  });

  it('sin reprogramaciones no muestra nada', () => {
    const { container } = render(<HistorialReprogramaciones reprogramaciones={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
