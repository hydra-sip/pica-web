import { act, render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BracketTorneo, EstadoPartido } from '../api/torneoApi';
import { server } from '../mocks/server';
import { BracketDelTorneo } from '../torneos/components/BracketDelTorneo';
import { mockDisconnect, mockEmitTorneoEvent, mockReconnect } from './websocketService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
const TORNEO = 100;
const SEMI = 1001;
const FINAL = 1002;

const lado = (inscripcionId: number, nombre: string, ganador: boolean | null = null) => ({
  inscripcionId,
  nombre,
  puntaje: null,
  penales: null,
  ganador,
});

/** Una semifinal de Halcones contra Águilas y la final; si la semi ya terminó, Halcones espera en la final. */
const bracket = (version: number, semi: EstadoPartido = 'EN_JUEGO'): BracketTorneo => {
  const termino = semi !== 'EN_JUEGO';
  return {
    torneoId: TORNEO,
    semilla: 'abc12345',
    listaHash: 'def67890',
    version,
    rondas: [
      {
        numero: 1,
        nombre: 'Semifinal',
        partidos: [
          {
            id: SEMI,
            ronda: 1,
            posicion: 1,
            estado: semi,
            bye: false,
            local: lado(1, 'Halcones FC', termino ? true : null),
            visitante: lado(2, 'Águilas Doradas', termino ? false : null),
            cancha: null,
            fechaProgramada: null,
            arbitro: null,
          },
        ],
      },
      {
        numero: 2,
        nombre: 'Final',
        partidos: [
          {
            id: FINAL,
            ronda: 2,
            posicion: 1,
            estado: 'PROGRAMADO',
            bye: false,
            local: termino ? lado(1, 'Halcones FC') : null,
            visitante: null,
            cancha: null,
            fechaProgramada: null,
            arbitro: null,
          },
        ],
      },
    ],
  };
};

/** El GET del bracket devuelve lo que diga `enServidor` y cuenta los pedidos. */
const servidor = (inicial: BracketTorneo) => {
  const estado = { enServidor: inicial, pedidos: 0 };
  server.use(
    http.get(`${API_URL}/torneos/${TORNEO}/bracket`, () => {
      estado.pedidos++;
      return HttpResponse.json(estado.enServidor);
    })
  );
  return estado;
};

const mostrar = async () => {
  render(<BracketDelTorneo torneoId={TORNEO} />);
  expect(await screen.findByText('Semifinal')).toBeInTheDocument();
};

const halconesEnLaFinal = () =>
  within(screen.getByRole('region', { name: 'Final' })).queryByText('Halcones FC');

describe('HU-809: el bracket en vivo se queda con la versión más nueva', () => {
  it.each([
    ['un resultado confirmado', 'CONFIRMADO'],
    ['una victoria por ausencia', 'WALKOVER'],
    ['un resultado corregido por laudo', 'CORREGIDO'],
  ] as const)('%s actualiza el bracket sin recargar', async (_caso, estado) => {
    const api = servidor(bracket(1));
    await mostrar();
    expect(halconesEnLaFinal()).toBeNull();

    mockEmitTorneoEvent(TORNEO, {
      tipo: 'RESULTADO_CONFIRMADO',
      partidoId: SEMI,
      bracket: bracket(2, estado),
    });

    await waitFor(() => expect(halconesEnLaFinal()).toBeInTheDocument());
    expect(api.pedidos).toBe(1);
  });

  it('un mensaje con una versión más vieja que la que se ve no cambia nada', async () => {
    servidor(bracket(5));
    await mostrar();

    mockEmitTorneoEvent(TORNEO, {
      tipo: 'RESULTADO_CONFIRMADO',
      partidoId: SEMI,
      bracket: bracket(4, 'CONFIRMADO'),
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(halconesEnLaFinal()).toBeNull();
  });

  it('si la versión salta, aplica el mensaje y vuelve a pedir el bracket', async () => {
    const api = servidor(bracket(1));
    await mostrar();
    api.enServidor = bracket(4, 'CONFIRMADO');

    mockEmitTorneoEvent(TORNEO, {
      tipo: 'RESULTADO_CONFIRMADO',
      partidoId: SEMI,
      bracket: bracket(4, 'CONFIRMADO'),
    });

    await waitFor(() => expect(api.pedidos).toBe(2));
    expect(halconesEnLaFinal()).toBeInTheDocument();
  });

  it('al reconectar vuelve a pedir el bracket y muestra el del servidor', async () => {
    const api = servidor(bracket(1));
    await mostrar();

    mockDisconnect();
    api.enServidor = bracket(3, 'WALKOVER');
    mockReconnect();

    await waitFor(() => expect(halconesEnLaFinal()).toBeInTheDocument());
    expect(api.pedidos).toBe(2);
  });

  it('un bracket del GET más viejo que el que llegó en vivo no lo pisa', async () => {
    const api = servidor(bracket(1));
    await mostrar();
    mockEmitTorneoEvent(TORNEO, {
      tipo: 'RESULTADO_CONFIRMADO',
      partidoId: SEMI,
      bracket: bracket(2, 'CONFIRMADO'),
    });
    await waitFor(() => expect(halconesEnLaFinal()).toBeInTheDocument());

    // el GET de la reconexión salió antes de la confirmación y responde con lo de antes
    api.enServidor = bracket(1);
    mockDisconnect();
    mockReconnect();

    await waitFor(() => expect(api.pedidos).toBe(2));
    await new Promise((r) => setTimeout(r, 50));
    expect(halconesEnLaFinal()).toBeInTheDocument();
  });
});

/** El cruce de la semifinal o de la final, como caja del bracket. */
const cruce = (ronda: 'Semifinal' | 'Final') =>
  screen.getByRole('region', { name: ronda }).querySelector('.bracket-partido');

describe('HU-809: el cruce que cambió se resalta', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('el cruce del mensaje queda resaltado y el resaltado se va solo', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    servidor(bracket(1));
    await mostrar();

    mockEmitTorneoEvent(TORNEO, {
      tipo: 'RESULTADO_CONFIRMADO',
      partidoId: SEMI,
      bracket: bracket(2, 'CONFIRMADO'),
    });

    await waitFor(() => expect(cruce('Semifinal')).toHaveClass('bracket-cruce-actualizado'));
    expect(cruce('Final')).not.toHaveClass('bracket-cruce-actualizado');
    act(() => {
      vi.advanceTimersByTime(2100);
    });
    expect(cruce('Semifinal')).not.toHaveClass('bracket-cruce-actualizado');
  });

  it('otro mensaje del mismo cambio, con la misma versión, resalta su cruce', async () => {
    servidor(bracket(1));
    await mostrar();
    mockEmitTorneoEvent(TORNEO, {
      tipo: 'PARTIDO_SIN_PRESENTES',
      partidoId: SEMI,
      bracket: bracket(2, 'WALKOVER'),
    });

    mockEmitTorneoEvent(TORNEO, {
      tipo: 'RESULTADO_CONFIRMADO',
      partidoId: FINAL,
      bracket: bracket(2, 'WALKOVER'),
    });

    await waitFor(() => expect(cruce('Final')).toHaveClass('bracket-cruce-actualizado'));
  });

  it('un mensaje viejo no resalta nada', async () => {
    servidor(bracket(5));
    await mostrar();

    mockEmitTorneoEvent(TORNEO, {
      tipo: 'RESULTADO_CONFIRMADO',
      partidoId: SEMI,
      bracket: bracket(4, 'CONFIRMADO'),
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(cruce('Semifinal')).not.toHaveClass('bracket-cruce-actualizado');
  });

  it('el bracket que llega al reconectar no resalta nada', async () => {
    const api = servidor(bracket(1));
    await mostrar();

    api.enServidor = bracket(3, 'CONFIRMADO');
    mockDisconnect();
    mockReconnect();

    await waitFor(() => expect(halconesEnLaFinal()).toBeInTheDocument());
    expect(document.querySelector('.bracket-cruce-actualizado')).toBeNull();
  });
});
