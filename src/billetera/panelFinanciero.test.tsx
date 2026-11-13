import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { PanelFinanciero } from '../api/custodiaApi';
import { prepararTorneoACancelar, TORNEO_A_CANCELAR } from '../mocks/cancelacionHandlers';
import { server } from '../mocks/server';
import { renderRuta } from '../test/renderRuta';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const LIQUIDADO_EN = '2026-11-10T15:00:00Z';

/** Un torneo de 4 jugadores ya liquidado: $4000 recaudados, $500 de gastos y $300 que aportó la rifa. */
const liquidado: PanelFinanciero = {
  torneoId: TORNEO_A_CANCELAR,
  torneoNombre: 'Copa liquidada',
  estado: 'FINALIZADO',
  liquidado: true,
  liquidadoEn: LIQUIDADO_EN,
  moneda: 'ARS',
  recaudado: 4000,
  gastosAdministrativos: 400,
  aporteRifa: 300,
  gastos: 500,
  reintegroOrganizador: 500,
  comprometidoEnPremios: 3800,
  pagos: 4,
};

/** La consola del torneo, como su organizador, en la pestaña Panel financiero. */
const panelFinanciero = async () => {
  prepararTorneoACancelar('EN_CURSO');
  server.use(
    http.get(`${API_URL}/torneos/opciones`, () => HttpResponse.json({ checkinDuracionMaxMin: 60 })),
    http.get(`${API_URL}/rifas/mis-rifas`, () =>
      HttpResponse.json({
        content: [],
        page: { size: 100, number: 0, totalElements: 0, totalPages: 0 },
      })
    )
  );
  const r = await renderRuta(`/torneos/${TORNEO_A_CANCELAR}/consola`, { usuario: 'organizador' });
  await r.user.click(await screen.findByRole('tab', { name: 'Panel financiero' }));
  return { ...r, panel: await screen.findByRole('region', { name: 'Panel financiero' }) };
};

/** El monto de la tarjeta de un indicador. */
const indicador = (panel: HTMLElement, titulo: string) =>
  within(panel).getByText(titulo).parentElement!;

describe('Panel financiero del torneo (HU-608 / T608-3)', () => {
  it('la consola tiene la pestaña Gestión por defecto y el panel financiero aparte, con la custodia', async () => {
    prepararTorneoACancelar('EN_CURSO');
    const { user } = await renderRuta(`/torneos/${TORNEO_A_CANCELAR}/consola`, {
      usuario: 'organizador',
    });

    expect(await screen.findByRole('tab', { name: 'Gestión' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.queryByRole('region', { name: 'Panel financiero' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Panel financiero' }));

    expect(await screen.findByRole('region', { name: 'Panel financiero' })).toBeInTheDocument();
    expect(await screen.findByRole('region', { name: 'Fondos en custodia' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Estructura del bracket' })).not.toBeInTheDocument();
  });

  it('en curso muestra los indicadores estimados y la descarga deshabilitada con el aviso', async () => {
    const { panel } = await panelFinanciero();

    expect(within(panel).getByText('Estimado en vivo')).toBeInTheDocument();
    expect(indicador(panel, 'Total recaudado')).toHaveTextContent(/\$\s20\.000,00/);
    expect(indicador(panel, 'Total recaudado')).toHaveTextContent('1 inscripción paga');
    expect(indicador(panel, 'Reintegro de gastos al organizador')).toHaveTextContent(
      /\$\s5\.000,00/
    );
    expect(indicador(panel, 'Gastos administrativos')).toHaveTextContent(/\$\s2\.000,00/);
    expect(indicador(panel, 'Comprometido en premios')).toHaveTextContent(/\$\s15\.000,00/);
    expect(within(panel).getByRole('note')).toHaveTextContent(
      'La liquidación final se emite cuando el torneo termina y se liquida'
    );
    expect(within(panel).getByRole('button', { name: /Liquidación final \(CSV\)/ })).toBeDisabled();
    expect(within(panel).getByRole('button', { name: /Liquidación final \(PDF\)/ })).toBeDisabled();
  });

  it('liquidado se descargan el CSV y el PDF de la liquidación final', async () => {
    const pedidos: string[] = [];
    server.use(
      http.get(`${API_URL}/torneos/${TORNEO_A_CANCELAR}/panel-financiero`, () =>
        HttpResponse.json(liquidado)
      ),
      http.get(`${API_URL}/torneos/${TORNEO_A_CANCELAR}/liquidacion`, ({ request }) => {
        const formato = new URL(request.url).searchParams.get('formato');
        pedidos.push(formato ?? 'json');
        return formato
          ? new HttpResponse('Liquidación final;Copa liquidada', {
              headers: { 'Content-Type': formato === 'pdf' ? 'application/pdf' : 'text/csv' },
            })
          : HttpResponse.json({ liquidado: false, total: 0, moneda: 'ARS', lineas: [] });
      })
    );
    // jsdom no implementa las URL de objetos ni la descarga: se agregan solo para esta prueba
    Object.assign(URL, {
      createObjectURL: () => 'blob:liquidacion',
      revokeObjectURL: () => undefined,
    });
    const descargas: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      descargas.push(this.download);
    });
    const { user, panel } = await panelFinanciero();

    expect(within(panel).getByText('Liquidado')).toBeInTheDocument();
    expect(indicador(panel, 'Comprometido en premios')).toHaveTextContent(
      'Incluye $ 300,00 que aporta la rifa'
    );
    expect(within(panel).queryByRole('note')).not.toBeInTheDocument();

    await user.click(within(panel).getByRole('button', { name: /Liquidación final \(CSV\)/ }));
    await user.click(within(panel).getByRole('button', { name: /Liquidación final \(PDF\)/ }));

    await vi.waitFor(() =>
      expect(descargas).toEqual([
        `liquidacion-torneo-${TORNEO_A_CANCELAR}.csv`,
        `liquidacion-torneo-${TORNEO_A_CANCELAR}.pdf`,
      ])
    );
    expect(pedidos).toContain('csv');
    expect(pedidos).toContain('pdf');
  });

  it('si la descarga falla, avisa', async () => {
    server.use(
      http.get(`${API_URL}/torneos/${TORNEO_A_CANCELAR}/panel-financiero`, () =>
        HttpResponse.json(liquidado)
      )
    );
    const { user, panel } = await panelFinanciero();

    await user.click(within(panel).getByRole('button', { name: /Liquidación final \(PDF\)/ }));

    expect(await within(panel).findByRole('alert')).toBeInTheDocument();
  });
});
