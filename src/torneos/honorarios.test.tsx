import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { esIngreso, TIPO_MOVIMIENTO_LABEL } from '../api/billeteraApi';
import { ArbitroDetalle, GastoDetalle, MiDesignacion } from '../api/torneoApi';
import { server } from '../mocks/server';
import { renderRuta } from '../test/renderRuta';
import { ArbitrosTorneo } from './components/ArbitrosTorneo';
import { GastosPrevistos } from './components/GastosPrevistos';
import { HonorariosDelTorneo } from './components/HonorariosDelTorneo';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const honorario: GastoDetalle = {
  gastoId: 2,
  descripcion: 'Árbitro principal',
  monto: 30000,
  tipo: 'HONORARIO_ARBITRAL',
  estadoPago: 'PENDIENTE',
  beneficiario: null,
  abonadoEn: null,
  comprobante: null,
};

const cancha: GastoDetalle = { ...honorario, gastoId: 1, descripcion: 'Cancha', tipo: 'OTRO' };

const arbitro = (
  usuarioId: number,
  username: string,
  cambios: Partial<ArbitroDetalle> = {}
): ArbitroDetalle => ({
  usuarioId,
  username,
  nombres: username,
  apellidos: 'Test',
  estado: 'ACEPTADO',
  permisos: ['CARGAR_RESULTADOS'],
  designadoEn: '2026-11-04T12:00:00Z',
  respondidoEn: '2026-11-04T13:00:00Z',
  motivoRechazo: null,
  identidadVerificada: true,
  ...cambios,
});

/** El torneo 7 en el back: sus gastos, sus árbitros y el saldo del organizador; guarda lo que se mandó. */
const conHonorarios = (gastos: GastoDetalle[], saldo = 50000) => {
  const enviado: { pago?: unknown; retiro?: boolean } = {};
  server.use(
    http.get(`${API_URL}/torneos/7/gastos`, () => HttpResponse.json(gastos)),
    http.get(`${API_URL}/torneos/7/arbitros`, () =>
      HttpResponse.json([
        arbitro(10, 'juez_ok'),
        arbitro(11, 'juez_sin_dni', { identidadVerificada: false }),
        arbitro(12, 'juez_rechazo', { estado: 'RECHAZADO' }),
      ])
    ),
    http.get(`${API_URL}/billetera`, () =>
      HttpResponse.json({ id: 1, saldoDisponible: saldo, saldoRetenido: 0, moneda: 'ARS' })
    ),
    http.post(`${API_URL}/torneos/7/gastos/2/pago`, async ({ request }) => {
      enviado.pago = await request.json();
      return HttpResponse.json({
        ...honorario,
        estadoPago: 'EN_CUSTODIA',
        beneficiario: { id: 10, username: 'juez_ok', nombres: 'juez_ok', apellidos: 'Test' },
        abonadoEn: '2026-11-11T12:00:00Z',
        comprobante: 'Transferencia interna pago-honorario-t7-g2-1',
      });
    }),
    http.delete(`${API_URL}/torneos/7/gastos/2/pago`, () => {
      enviado.retiro = true;
      return HttpResponse.json(honorario);
    })
  );
  return enviado;
};

const consola = () =>
  render(
    <MemoryRouter>
      <HonorariosDelTorneo torneoId={7} estado="EN_CURSO" />
    </MemoryRouter>
  );

describe('HU-604 / T604-2: el organizador paga el honorario desde la consola', () => {
  it('elige un árbitro verificado que no rechazó y deposita el honorario en la custodia', async () => {
    const enviado = conHonorarios([cancha, honorario]);
    consola();

    const tarjeta = await screen.findByRole('region', { name: 'Honorarios arbitrales' });
    expect(within(tarjeta).getByText(/Tu saldo disponible: \$\s50\.000,00/)).toBeInTheDocument();
    // solo los honorarios: la cancha es un gasto común
    expect(within(tarjeta).queryByText('Cancha')).not.toBeInTheDocument();
    const fila = within(tarjeta).getByText('Árbitro principal').closest('tr')!;
    expect(within(fila).getByText('Sin depositar')).toBeInTheDocument();
    const elegir = within(fila).getByRole('combobox', { name: 'Árbitro para Árbitro principal' });
    expect(
      within(elegir)
        .getAllByRole('option')
        .map((o) => o.textContent)
    ).toEqual(['Elegí un árbitro', 'juez_ok Test (@juez_ok)']);
    const pagar = within(fila).getByRole('button', { name: 'Pagar honorario' });
    expect(pagar).toBeDisabled();

    await userEvent.selectOptions(elegir, '10');
    await userEvent.click(pagar);
    const confirmar = await screen.findByRole('dialog', { name: '¿Pagar el honorario?' });
    expect(confirmar).toHaveTextContent(/se los acredita a juez_ok Test/);
    await userEvent.click(within(confirmar).getByRole('button', { name: /Pagar \$\s30\.000,00/ }));

    await waitFor(() => expect(enviado.pago).toEqual({ arbitroId: 10 }));
    expect(await within(fila).findByText('En custodia')).toBeInTheDocument();
    expect(within(fila).getByText('juez_ok Test (@juez_ok)')).toBeInTheDocument();
    expect(within(fila).getByRole('button', { name: 'Retirar' })).toBeInTheDocument();
  });

  it('si el saldo no alcanza, no deja pagar y ofrece cargar saldo', async () => {
    conHonorarios([honorario], 1000);
    consola();

    const fila = (await screen.findByText('Árbitro principal')).closest('tr')!;
    await userEvent.selectOptions(within(fila).getByRole('combobox'), '10');

    expect(within(fila).getByRole('button', { name: 'Pagar honorario' })).toBeDisabled();
    expect(within(fila).getByRole('link', { name: 'Cargar saldo' })).toHaveAttribute(
      'href',
      '/billetera'
    );
  });

  it('un honorario en custodia se puede retirar y vuelve a quedar sin depositar', async () => {
    const enviado = conHonorarios([
      {
        ...honorario,
        estadoPago: 'EN_CUSTODIA',
        beneficiario: { id: 10, username: 'juez_ok', nombres: 'juez_ok', apellidos: 'Test' },
      },
    ]);
    consola();

    const fila = (await screen.findByText('Árbitro principal')).closest('tr')!;
    await userEvent.click(within(fila).getByRole('button', { name: 'Retirar' }));

    await waitFor(() => expect(enviado.retiro).toBe(true));
    expect(await within(fila).findByText('Sin depositar')).toBeInTheDocument();
  });

  it('con el torneo finalizado solo muestra el estado, y sin honorarios no se muestra', async () => {
    conHonorarios([{ ...honorario, estadoPago: 'ACREDITADO' }]);
    const { unmount } = render(
      <MemoryRouter>
        <HonorariosDelTorneo torneoId={7} estado="FINALIZADO" />
      </MemoryRouter>
    );
    expect(await screen.findByText('Acreditado al árbitro')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    unmount();

    let pedido = false;
    conHonorarios([cancha]);
    server.use(
      http.get(`${API_URL}/torneos/7/gastos`, () => {
        pedido = true;
        return HttpResponse.json([cancha]);
      })
    );
    consola();
    await waitFor(() => expect(pedido).toBe(true));
    expect(screen.queryByRole('region', { name: 'Honorarios arbitrales' })).not.toBeInTheDocument();
  });
});

describe('HU-604 / T604-2: identidad del árbitro y gastos del paso 3', () => {
  it('en un torneo con dinero no deja designar a quien no verificó su identidad', async () => {
    server.use(
      http.get(`${API_URL}/torneos/1/arbitros`, () => HttpResponse.json([])),
      http.get(`${API_URL}/arbitros`, () =>
        HttpResponse.json({
          content: [
            {
              id: 7,
              username: 'juez',
              nombres: 'Juan',
              apellidos: 'Pérez',
              identidadVerificada: true,
            },
            {
              id: 8,
              username: 'nuevo',
              nombres: 'Nico',
              apellidos: 'Sosa',
              identidadVerificada: false,
            },
          ],
          totalElements: 2,
          totalPages: 1,
          number: 0,
          size: 8,
        })
      )
    );
    render(<ArbitrosTorneo torneoId={1} habilitado conDinero />);

    const nico = (await screen.findByText('Nico Sosa')).closest('li')!;
    expect(within(nico).getByText('Identidad sin verificar')).toBeInTheDocument();
    expect(within(nico).getByRole('button', { name: 'Designar' })).toBeDisabled();
    const juan = screen.getByText('Juan Pérez').closest('li')!;
    expect(within(juan).getByRole('button', { name: 'Designar' })).toBeEnabled();
    expect(
      screen.getByText(/solo podés designar árbitros con la identidad verificada/)
    ).toBeInTheDocument();
  });

  it('un gasto se puede marcar como honorario arbitral', async () => {
    let cuerpo: unknown;
    server.use(
      http.post(`${API_URL}/torneos/1/gastos`, async ({ request }) => {
        cuerpo = await request.json();
        return HttpResponse.json({ ...honorario, gastoId: 3 }, { status: 201 });
      })
    );
    let gastos: GastoDetalle[] = [];
    render(<GastosPrevistos torneoId={1} gastos={[]} onCambio={(g) => (gastos = g)} habilitado />);

    await userEvent.type(screen.getByRole('textbox', { name: 'Nuevo gasto' }), 'Árbitro principal');
    await userEvent.type(
      screen.getByRole('spinbutton', { name: 'Monto del nuevo gasto' }),
      '30000'
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Es un honorario arbitral' }));
    await userEvent.click(screen.getByRole('button', { name: 'Agregar gasto' }));

    await waitFor(() =>
      expect(cuerpo).toEqual({
        descripcion: 'Árbitro principal',
        monto: 30000,
        tipo: 'HONORARIO_ARBITRAL',
      })
    );
    expect(gastos[0].tipo).toBe('HONORARIO_ARBITRAL');
  });
});

describe('HU-604 / T604-2: el árbitro ve sus honorarios (wireframe 49)', () => {
  const designacion: MiDesignacion = {
    torneoId: 9,
    torneo: 'Copa Primavera',
    slug: 'copa-primavera',
    disciplina: 'Fútbol 5',
    estadoTorneo: 'INSCRIPCION_ABIERTA',
    fechaInicio: '2026-11-20T18:00:00Z',
    fechaFin: '2026-11-22T18:00:00Z',
    organizador: 'Olga Organizadora',
    estado: 'PENDIENTE',
    permisos: ['RESOLVER_OBJECIONES'],
    designadoEn: '2026-11-04T12:00:00Z',
    respondidoEn: null,
    motivoRechazo: null,
    honorario: { monto: 30000, moneda: 'ARS', estado: 'EN_CUSTODIA' },
  };

  it('la custodia de honorarios muestra el total retenido hasta la liquidación', async () => {
    server.use(http.get(`${API_URL}/designaciones/mias`, () => HttpResponse.json([designacion])));
    await renderRuta('/mis-designaciones/9');

    const custodia = (await screen.findByRole('heading', { name: 'Custodia de honorarios' }))
      .parentElement!;
    expect(
      within(custodia).getByText('Total de honorarios acordados').parentElement
    ).toHaveTextContent(/\$\s30\.000,00/);
    expect(within(custodia).getByText('Retenido en custodia')).toBeInTheDocument();
    expect(within(custodia).getByText(/cuando finaliza el torneo/)).toBeInTheDocument();
  });

  it('sin depósito avisa que el organizador todavía no lo hizo', async () => {
    server.use(
      http.get(`${API_URL}/designaciones/mias`, () =>
        HttpResponse.json([{ ...designacion, honorario: null }])
      )
    );
    await renderRuta('/mis-designaciones/9');

    expect(
      await screen.findByText(/El organizador todavía no depositó honorarios para vos/)
    ).toBeInTheDocument();
  });

  it('en Mi billetera el honorario es un ingreso', () => {
    expect(esIngreso('HONORARIO')).toBe(true);
    expect(esIngreso('PAGO_SERVICIO')).toBe(false);
    expect(TIPO_MOVIMIENTO_LABEL.HONORARIO).toBe('Honorario arbitral');
  });
});
