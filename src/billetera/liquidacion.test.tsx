import { render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { RepartoLiquidacion } from '../api/custodiaApi';
import { TicketDetalle } from '../api/rifaApi';
import { setMovimientosMock } from '../mocks/data';
import { server } from '../mocks/server';
import { resultadoDelTicket } from '../rifas/formato';
import { fechaHora } from '../shared/formato';
import { renderRuta } from '../test/renderRuta';
import { TorneoDetalle } from '../torneos/types/torneo';
import { RepartoDeLaLiquidacion } from './components/RepartoDeLaLiquidacion';

const LIQUIDADO_EN = '2026-11-09T15:00:00Z';

/** Un torneo de 4 jugadores: pozo 3500 (70 / 30), 500 de gastos y 400 de la plataforma; la rifa aportó 300. */
const reparto: RepartoLiquidacion = {
  liquidado: true,
  liquidadoEn: LIQUIDADO_EN,
  total: 4700,
  moneda: 'ARS',
  lineas: [
    {
      rol: 'PREMIO',
      origen: 'TORNEO',
      puesto: 1,
      beneficiarioNombre: 'Ana García',
      beneficiarioUsername: 'agarcia',
      equipoNombre: 'Los Halcones',
      monto: 2450,
      acreditadoEn: LIQUIDADO_EN,
    },
    {
      rol: 'PREMIO',
      origen: 'TORNEO',
      puesto: 2,
      beneficiarioNombre: 'Beto Díaz',
      beneficiarioUsername: 'bdiaz',
      equipoNombre: 'La Matanza',
      monto: 1050,
      acreditadoEn: LIQUIDADO_EN,
    },
    {
      rol: 'ORGANIZADOR',
      origen: 'TORNEO',
      puesto: null,
      beneficiarioNombre: 'Org Eventos',
      beneficiarioUsername: 'organizador',
      equipoNombre: null,
      monto: 500,
      acreditadoEn: LIQUIDADO_EN,
    },
    {
      rol: 'PLATAFORMA',
      origen: 'TORNEO',
      puesto: null,
      beneficiarioNombre: null,
      beneficiarioUsername: null,
      equipoNombre: null,
      monto: 400,
      acreditadoEn: LIQUIDADO_EN,
    },
    {
      rol: 'PREMIO',
      origen: 'APORTE_RIFA',
      puesto: 1,
      beneficiarioNombre: 'Ana García',
      beneficiarioUsername: 'agarcia',
      equipoNombre: 'Los Halcones',
      monto: 300,
      acreditadoEn: LIQUIDADO_EN,
    },
  ],
};

const repartoDelTorneo = () =>
  render(
    <MemoryRouter>
      <RepartoDeLaLiquidacion evento="torneos" id={7} />
    </MemoryRouter>
  );

describe('HU-606 / T606-3: el reparto de la liquidación para el organizador (wireframe 64)', () => {
  it('muestra el total, los premios por puesto, la plataforma y cada acreditación', async () => {
    server.use(http.get('*/torneos/7/liquidacion', () => HttpResponse.json(reparto)));

    repartoDelTorneo();

    const tarjeta = await screen.findByRole('region', { name: 'Reparto de la liquidación' });
    expect(within(tarjeta).getByText('Liquidado')).toBeInTheDocument();
    expect(within(tarjeta).getByText(new RegExp(fechaHora(LIQUIDADO_EN)))).toBeInTheDocument();
    expect(within(tarjeta).getByText('Total repartido').parentElement).toHaveTextContent(
      /\$\s4\.700,00/
    );
    expect(
      within(tarjeta).getByText('Custodia del torneo y aporte de la rifa')
    ).toBeInTheDocument();
    // el 1.º cobra el pozo y lo que aportó la rifa
    expect(within(tarjeta).getByText('Premio 1º puesto').parentElement).toHaveTextContent(
      /\$\s2\.750,00/
    );
    expect(within(tarjeta).getByText('Premio 2º puesto').parentElement).toHaveTextContent(
      /\$\s1\.050,00/
    );
    expect(within(tarjeta).getByText('Plataforma').parentElement).toHaveTextContent(/\$\s400,00/);

    const filas = within(tarjeta).getAllByRole('row').slice(1);
    expect(filas).toHaveLength(5);
    expect(filas[0]).toHaveTextContent(
      /Ana García \(Los Halcones\).*Premio del 1º puesto.*Torneo.*2\.450,00.*Acreditado/
    );
    expect(filas[2]).toHaveTextContent(/Org Eventos.*Gastos del torneo/);
    expect(filas[3]).toHaveTextContent(/Plataforma PICA.*Gastos administrativos/);
    expect(filas[4]).toHaveTextContent(/Aporte de la rifa.*300,00/);
  });

  it('mientras no se liquidó no se muestra', async () => {
    let pedido = false;
    server.use(
      http.get('*/torneos/7/liquidacion', () => {
        pedido = true;
        return HttpResponse.json({ liquidado: false, total: 0, moneda: 'ARS', lineas: [] });
      })
    );

    repartoDelTorneo();

    await waitFor(() => expect(pedido).toBe(true));
    expect(
      screen.queryByRole('region', { name: 'Reparto de la liquidación' })
    ).not.toBeInTheDocument();
  });
});

describe('HU-606 / T606-3: el premio llega a la billetera del ganador', () => {
  it('Mi billetera muestra el premio y la liquidación como ingresos, con el evento y qué fue', async () => {
    setMovimientosMock([
      {
        id: 501,
        tipo: 'PREMIO',
        monto: 900,
        moneda: 'ARS',
        saldoResultante: 10350,
        estado: 'CONFIRMADO',
        referenciaExterna: 'liq-r1-premio-1',
        descripcion: 'Premio del 1.º puesto en la rifa Gran Rifa Solidaria',
        // una rifa con torneo trae los dos: va a la rifa
        torneo: {
          id: 1,
          nombre: 'Torneo Relámpago',
          titulo: 'Torneo Relámpago Apertura',
          slug: 'torneo-relampago-apertura',
        },
        rifa: { id: 1, titulo: 'Gran Rifa Solidaria' },
        creadoEn: LIQUIDADO_EN,
      },
      {
        id: 502,
        tipo: 'LIQUIDACION',
        monto: 500,
        moneda: 'ARS',
        saldoResultante: 10850,
        estado: 'CONFIRMADO',
        referenciaExterna: 'liq-t1-organizador',
        descripcion: 'Liquidación del torneo Torneo Relámpago: gastos del torneo',
        torneo: {
          id: 1,
          nombre: 'Torneo Relámpago',
          titulo: 'Torneo Relámpago Apertura',
          slug: 'torneo-relampago-apertura',
        },
        rifa: null,
        creadoEn: LIQUIDADO_EN,
      },
    ]);

    await renderRuta('/billetera', { usuario: 'participante' });

    expect(await screen.findByText('Liquidación')).toBeInTheDocument();
    expect(screen.getByText(/\+\s*\$\s*900,00/)).toBeInTheDocument();
    expect(screen.getByText(/\+\s*\$\s*500,00/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Gran Rifa Solidaria' })).toHaveAttribute(
      'href',
      '/rifas/1'
    );
    expect(
      screen.getByText('Premio del 1.º puesto en la rifa Gran Rifa Solidaria')
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Torneo Relámpago Apertura' })).toHaveAttribute(
      'href',
      '/torneos/torneo-relampago-apertura'
    );
    expect(
      screen.getByText('Liquidación del torneo Torneo Relámpago: gastos del torneo')
    ).toBeInTheDocument();
  });

  it('el ticket ganador de una rifa liquidada dice cuánto se le acreditó', () => {
    const ticket: TicketDetalle = {
      id: 5,
      codigo: 'R1-4F2K9Q',
      rifaId: 1,
      rifaTitulo: 'Rifa del club',
      compradorId: 10,
      compradorNombre: 'Ana García',
      numeros: [7, 12],
      monto: 1000,
      comision: 100,
      moneda: 'ARS',
      creadoEn: '2026-10-29T12:00:00Z',
      rifaEstado: 'LIQUIDADA',
      sorteadaEn: '2026-10-31T15:00:00Z',
      esComprador: true,
      ventanaReclamoAbierta: false,
      premiosGanados: [{ puesto: 1, pct: 60, descripcion: null, numeroGanador: 12 }],
      premioAcreditado: 900,
    };

    expect(resultadoDelTicket(ticket)?.texto).toMatch(
      /^¡Ganaste el 1º premio con el #12! Te acreditamos \$\s900,00 en tu billetera\.$/
    );
    // sorteada y todavía sin liquidar, no promete nada
    expect(
      resultadoDelTicket({ ...ticket, rifaEstado: 'SORTEADA', premioAcreditado: null })?.texto
    ).toBe('¡Ganaste el 1º premio con el #12!');
  });
});

describe('HU-606 / T606-3: la ficha del torneo dice que se liquidó', () => {
  const torneo: TorneoDetalle = {
    id: 51,
    slug: 'torneo-liquidado',
    nombre: 'Copa Liquidada 2026',
    descripcion: 'Un torneo que ya terminó.',
    disciplina: 'Ajedrez',
    formato: 'ELIMINACION_DIRECTA',
    modalidad: 'ONLINE',
    tipoParticipante: 'INDIVIDUAL',
    sede: null,
    estado: 'FINALIZADO',
    cupoMaximo: 8,
    cupoMinimo: 2,
    cupoDisponible: 4,
    tamanioEquipo: null,
    nominaMaxima: null,
    valorInscripcion: 1000,
    moneda: 'ARS',
    pctGastosAdministrativos: 10,
    gastosAdministrativos: 100,
    totalAPagar: 1100,
    pozoEstimado: 7500,
    premios: [{ puesto: 1, pct: 100, monto: 7500 }],
    cierreInscripcionEn: '2026-10-01T20:00:00Z',
    fechaInicio: '2026-10-05T10:00:00Z',
    fechaFin: '2026-10-06T19:30:00Z',
    reglamentoTexto: 'Reglamento.',
    reglamentoUrl: null,
    reglamentoHash: null,
    organizador: { id: 4, nombreCompleto: 'Organizador Eventos', username: 'organizador' },
    publicadoEn: '2026-09-20T10:00:00Z',
    liquidadoEn: LIQUIDADO_EN,
  };

  it('muestra "Liquidado" con la fecha', async () => {
    server.use(
      http.get('*/torneos/slug/torneo-liquidado', () => HttpResponse.json(torneo)),
      http.get('*/partidos/mi-proximo', () => HttpResponse.json(null)),
      http.get('*/inscripciones/mias', () =>
        HttpResponse.json({
          content: [],
          page: { size: 10, number: 0, totalElements: 0, totalPages: 0 },
        })
      )
    );

    await renderRuta('/torneos/torneo-liquidado', { usuario: 'anonimo' });

    expect(await screen.findByRole('heading', { name: 'Copa Liquidada 2026' })).toBeInTheDocument();
    expect(screen.getByText(`Liquidado el ${fechaHora(LIQUIDADO_EN)}`)).toBeInTheDocument();
  });
});
