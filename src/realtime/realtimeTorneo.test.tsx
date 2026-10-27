import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { BracketTorneo, TorneoInformacion } from '../api/torneoApi';
import { RifaDetalle } from '../api/rifaApi';
import { AuthProvider } from '../auth/context/AuthContext';
import { server } from '../mocks/server';
import { BracketDelTorneo } from '../torneos/components/BracketDelTorneo';
import { TorneoConsolaPage } from '../torneos/pages/TorneoConsolaPage';
import { TorneoDetallePage } from '../torneos/pages/TorneoDetallePage';
import { RifaFormPage } from '../rifas/pages/RifaFormPage';
import { TorneoDetalle } from '../torneos/types/torneo';
import {
  mockDisconnect,
  mockEmitRifaEvent,
  mockEmitTorneoEvent,
  mockReconnect,
} from './websocketService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const bracketInicial: BracketTorneo = {
  torneoId: 100,
  semilla: 'abc12345',
  listaHash: 'def67890',
  rondas: [
    {
      numero: 1,
      nombre: 'Semifinal',
      partidos: [
        {
          id: 1001,
          ronda: 1,
          posicion: 1,
          estado: 'EN_JUEGO',
          bye: false,
          local: {
            inscripcionId: 1,
            nombre: 'Halcones FC',
            puntaje: null,
            penales: null,
            ganador: null,
          },
          visitante: {
            inscripcionId: 2,
            nombre: 'Águilas Doradas',
            puntaje: null,
            penales: null,
            ganador: null,
          },
          cancha: 'Cancha 1',
          fechaProgramada: '2026-11-01T15:00:00Z',
          arbitro: 'Juan Perez',
        },
      ],
    },
    {
      numero: 2,
      nombre: 'Final',
      partidos: [
        {
          id: 1002,
          ronda: 2,
          posicion: 1,
          estado: 'PROGRAMADO',
          bye: false,
          local: null, // "A definir"
          visitante: null, // "A definir"
          cancha: 'Cancha Central',
          fechaProgramada: '2026-11-01T18:00:00Z',
          arbitro: 'Juan Perez',
        },
      ],
    },
  ],
};

const bracketAvanzado: BracketTorneo = {
  ...bracketInicial,
  rondas: [
    {
      numero: 1,
      nombre: 'Semifinal',
      partidos: [
        {
          ...bracketInicial.rondas[0].partidos[0],
          estado: 'CONFIRMADO',
          local: {
            inscripcionId: 1,
            nombre: 'Halcones FC',
            puntaje: 3,
            penales: null,
            ganador: true,
          },
          visitante: {
            inscripcionId: 2,
            nombre: 'Águilas Doradas',
            puntaje: 1,
            penales: null,
            ganador: false,
          },
        },
      ],
    },
    {
      numero: 2,
      nombre: 'Final',
      partidos: [
        {
          ...bracketInicial.rondas[1].partidos[0],
          local: {
            inscripcionId: 1,
            nombre: 'Halcones FC',
            puntaje: null,
            penales: null,
            ganador: null,
          },
          visitante: null,
        },
      ],
    },
  ],
};

const torneoDetalleMock: TorneoDetalle = {
  id: 100,
  slug: 'torneo-tiempo-real',
  nombre: 'Copa Primavera Tiempo Real',
  descripcion: 'Torneo con actualización en vivo de bracket y pozo.',
  disciplina: 'Fútbol 5',
  formato: 'ELIMINACION_DIRECTA',
  modalidad: 'PRESENCIAL',
  tipoParticipante: 'EQUIPO',
  sede: 'Club UNLu',
  estado: 'EN_CURSO',
  cupoMaximo: 8,
  cupoMinimo: 4,
  cupoDisponible: 0,
  tamanioEquipo: 5,
  valorInscripcion: 5000,
  moneda: 'ARS',
  pctPozoCompetidores: 70,
  pctPremioRifa: 20,
  pozoEstimado: 48000,
  premioRifaEstimado: 12000,
  premios: [
    { puesto: 1, pct: 70, monto: 33600 },
    { puesto: 2, pct: 30, monto: 14400 },
  ],
  cierreInscripcionEn: '2026-10-20T12:00:00Z',
  fechaInicio: '2026-10-25T14:00:00Z',
  fechaFin: null,
  reglamentoTexto: 'Reglamento oficial.',
  reglamentoUrl: null,
  reglamentoHash: null,
  organizador: {
    id: 1,
    nombreCompleto: 'Organizador PICA',
    username: 'organizador_pica',
  },
  publicadoEn: '2026-10-15T10:00:00Z',
};

const torneoInformacionMock: TorneoInformacion = {
  id: 100,
  nombre: 'Copa Primavera Tiempo Real',
  disciplina: 'Fútbol 5',
  descripcion: 'Torneo con actualización en vivo.',
  formato: 'ELIMINACION_DIRECTA',
  modalidad: 'PRESENCIAL',
  tipoParticipante: 'EQUIPO',
  sede: 'Club UNLu',
  canchas: ['Cancha 1'],
  fechaInicio: '2026-10-25T14:00:00Z',
  fechaFin: null,
  cierreInscripcionEn: '2026-10-20T12:00:00Z',
  reglamentoTexto: null,
  cupoMaximo: 8,
  cupoMinimo: 4,
  tamanioEquipo: 5,
  nominaMaxima: 8,
  estado: 'EN_CURSO',
  pasoPendiente: null,
  reglamentoUrl: null,
  reglamentoHash: null,
  slug: 'torneo-tiempo-real',
  esquemaHash: null,
  publicadoEn: '2026-10-15T10:00:00Z',
  inscripcionCerradaEn: '2026-10-20T12:00:00Z',
  listaHash: 'def67890',
  creadoEn: '2026-10-10T10:00:00Z',
  modificadoEn: '2026-10-10T10:00:00Z',
  camposBloqueados: [],
  economia: {
    valorInscripcion: 5000,
    moneda: 'ARS',
    pctPozoCompetidores: 70,
    pctPremioRifa: 20,
    pctComision: 10,
    premios: [
      { puesto: 1, pct: 70 },
      { puesto: 2, pct: 30 },
    ],
  },
};

const rifaMock: RifaDetalle = {
  id: 200,
  titulo: 'Gran Rifa Copa Primavera',
  descripcion: 'Rifa oficial del torneo',
  torneoId: 100,
  torneoNombre: 'Copa Primavera Tiempo Real',
  estado: 'BORRADOR',
  numeroDesde: 1,
  numeroHasta: 100,
  precioNumero: 500,
  moneda: 'ARS',
  ventaDesde: '2026-10-15T10:00:00Z',
  ventaHasta: '2026-11-01T12:00:00Z',
  fechaSorteo: '2026-11-01T18:00:00Z',
  pctDestinadoTorneo: 50,
  terminosAceptadosEn: null,
  loteriaDeclaradaEn: null,
  premios: [{ puesto: 1, pct: 100, descripcion: 'Smart TV', numeroGanador: null }],
  creadoEn: '2026-10-15T10:00:00Z',
  modificadoEn: null,
};

describe('HU-305: Actualización en tiempo real de bracket, pozo y estado', () => {
  it('Criterio 1: Confirmar el resultado de un partido y comprobar que el bracket refleja el avance del ganador a la siguiente instancia sin recarga de página', async () => {
    server.use(
      http.get(`${API_URL}/torneos/100/bracket`, () => {
        return HttpResponse.json(bracketInicial);
      })
    );

    render(<BracketDelTorneo torneoId={100} />);

    // Esperar a que cargue el bracket inicial
    expect(await screen.findByText('Semifinal')).toBeInTheDocument();
    expect(screen.getByText('Final')).toBeInTheDocument();

    // En la final, los dos lados están "A definir"
    const aDefinirIniciales = screen.getAllByText('A definir');
    expect(aDefinirIniciales.length).toBe(2);

    // Simular que el backend emite la confirmación de resultado con el bracket avanzado
    mockEmitTorneoEvent(100, {
      tipo: 'RESULTADO_CONFIRMADO',
      torneoId: 100,
      bracket: bracketAvanzado,
    });

    // Sin recargar la página, "Halcones FC" avanzó a la final (aparece en Semifinal y en Final)
    await waitFor(() => {
      const halcones = screen.getAllByText('Halcones FC');
      expect(halcones.length).toBe(2);
    });

    // Ahora en la final solo queda 1 lado "A definir" (el rival)
    expect(screen.getAllByText('A definir').length).toBe(1);
  });

  it('Criterio 2: Registrar una venta que incrementa el pozo del torneo y comprobar que el monto mostrado se actualiza en tiempo real para todos los usuarios conectados', async () => {
    server.use(
      http.get(`${API_URL}/torneos/slug/torneo-tiempo-real`, () => {
        return HttpResponse.json(torneoDetalleMock);
      }),
      http.get(`${API_URL}/torneos/100/mi-proximo-partido`, () => {
        return HttpResponse.json(null);
      }),
      http.get(`${API_URL}/partidos/mi-proximo`, () => {
        return HttpResponse.json(null);
      }),
      http.get(`${API_URL}/torneos/100/bracket`, () => {
        return HttpResponse.json(bracketInicial);
      })
    );

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/torneos/torneo-tiempo-real']}>
          <Routes>
            <Route path="/torneos/:slug" element={<TorneoDetallePage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    // Esperar a que se renderice el monto del pozo inicial ($ 48.000)
    const elementosPozoInicial = await screen.findAllByText(/\$ 48\.000/);
    expect(elementosPozoInicial.length).toBeGreaterThan(0);

    // Se registra una venta que incrementa el pozo a $ 62.500
    mockEmitTorneoEvent(100, {
      tipo: 'VENTA_REGISTRADA',
      torneoId: 100,
      pozoEstimado: 62500,
      premioRifaEstimado: 15000,
    });

    // Se verifica que el monto mostrado en pantalla se actualiza en tiempo real
    await waitFor(() => {
      const elementosPozoNuevo = screen.getAllByText(/\$ 62\.500/);
      expect(elementosPozoNuevo.length).toBeGreaterThan(0);
    });
  });

  it('Criterio 3: Cambiar el estado general del torneo (por ejemplo, de "en curso" a "finalizado") y comprobar que se refleja en tiempo real en las vistas de los usuarios', async () => {
    server.use(
      http.get(`${API_URL}/torneos/slug/torneo-tiempo-real`, () => {
        return HttpResponse.json(torneoDetalleMock);
      }),
      http.get(`${API_URL}/torneos/100/mi-proximo-partido`, () => {
        return HttpResponse.json(null);
      }),
      http.get(`${API_URL}/partidos/mi-proximo`, () => {
        return HttpResponse.json(null);
      }),
      http.get(`${API_URL}/torneos/100/bracket`, () => {
        return HttpResponse.json(bracketInicial);
      })
    );

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/torneos/torneo-tiempo-real']}>
          <Routes>
            <Route path="/torneos/:slug" element={<TorneoDetallePage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    // Esperar al estado inicial: "En curso"
    expect(await screen.findByText(/En curso/i)).toBeInTheDocument();

    // Se emite un cambio de estado a FINALIZADO
    mockEmitTorneoEvent(100, {
      tipo: 'ESTADO_CAMBIADO',
      torneoId: 100,
      estado: 'FINALIZADO',
    });

    // Se refleja en tiempo real sin recargar la página
    await waitFor(() => {
      expect(screen.getByText(/Finalizado/i)).toBeInTheDocument();
    });
  });

  it('Criterio 4: Simular una desconexión momentánea del cliente y comprobar que, al reconectar, se sincroniza con el estado real del torneo', async () => {
    let llamadasGetSlug = 0;
    let estadoEnServidor: TorneoDetalle = {
      ...torneoDetalleMock,
      pozoEstimado: 48000,
      estado: 'EN_CURSO',
    };

    server.use(
      http.get(`${API_URL}/torneos/slug/torneo-tiempo-real`, () => {
        llamadasGetSlug++;
        return HttpResponse.json(estadoEnServidor);
      }),
      http.get(`${API_URL}/torneos/100/mi-proximo-partido`, () => {
        return HttpResponse.json(null);
      }),
      http.get(`${API_URL}/partidos/mi-proximo`, () => {
        return HttpResponse.json(null);
      }),
      http.get(`${API_URL}/torneos/100/bracket`, () => {
        return HttpResponse.json(bracketInicial);
      })
    );

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/torneos/torneo-tiempo-real']}>
          <Routes>
            <Route path="/torneos/:slug" element={<TorneoDetallePage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    // Inicialmente cargó una vez desde el servidor
    const pozosIniciales = await screen.findAllByText(/\$ 48\.000/);
    expect(pozosIniciales.length).toBeGreaterThan(0);
    expect(llamadasGetSlug).toBe(1);

    // 1. Simular desconexión momentánea del cliente
    mockDisconnect();

    // 2. Mientras el cliente estuvo desconectado, en el servidor se realizaron cambios (ventas y finalización)
    estadoEnServidor = {
      ...torneoDetalleMock,
      pozoEstimado: 95000,
      estado: 'FINALIZADO',
    };

    // 3. El cliente vuelve a conectarse
    mockReconnect();

    // 4. Comprobar que al reconectar, se vuelve a consultar el servidor y se sincroniza
    await waitFor(() => {
      expect(llamadasGetSlug).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText(/\$ 95\.000/).length).toBeGreaterThan(0);
      expect(screen.getByText(/Finalizado/i)).toBeInTheDocument();
    });
  });

  it('T305-2: Consola del torneo y Rifa suscriptos, al reconectarse recargan el estado', async () => {
    let llamadasRifa = 0;
    let rifaEnServidor = { ...rifaMock };

    server.use(
      http.get(`${API_URL}/rifas/200`, () => {
        llamadasRifa++;
        return HttpResponse.json(rifaEnServidor);
      }),
      http.get(`${API_URL}/torneos/100`, () => {
        return HttpResponse.json(torneoInformacionMock);
      }),
      http.get(`${API_URL}/torneos/100/bracket`, () => {
        return HttpResponse.json(bracketInicial);
      }),
      http.get(`${API_URL}/torneos/100/inscripciones`, () => {
        return HttpResponse.json({
          content: [],
          page: { size: 20, number: 0, totalElements: 0, totalPages: 0 },
        });
      }),
      http.get(`${API_URL}/partidos/torneo/100/objeciones`, () => {
        return HttpResponse.json([]);
      })
    );

    // Probar suscripción de rifa
    render(
      <MemoryRouter initialEntries={['/rifas/200/editar']}>
        <Routes>
          <Route path="/rifas/:id/editar" element={<RifaFormPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(
      await screen.findByRole('heading', { name: 'Gran Rifa Copa Primavera', level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByText('Borrador')).toBeInTheDocument();
    expect(llamadasRifa).toBe(1);

    // Simular evento en tiempo real en la rifa (cambio de estado a EN_VENTA y título nuevo)
    mockEmitRifaEvent(200, {
      tipo: 'RIFA_ACTUALIZADA',
      rifaId: 200,
      estado: 'EN_VENTA',
      rifa: {
        ...rifaMock,
        titulo: 'Gran Rifa Copa Primavera - Edición Especial',
        estado: 'EN_VENTA',
      },
    });

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: 'Gran Rifa Copa Primavera - Edición Especial',
          level: 1,
        })
      ).toBeInTheDocument();
      expect(screen.getByText('En venta')).toBeInTheDocument();
    });

    // Simular desconexión y cambio en backend mientras está offline
    mockDisconnect();
    rifaEnServidor = {
      ...rifaMock,
      titulo: 'Gran Rifa Copa Primavera - Estado Sincronizado',
      estado: 'CERRADA',
    };

    // Al reconectar, debe recargar del servidor
    mockReconnect();

    await waitFor(() => {
      expect(llamadasRifa).toBeGreaterThanOrEqual(2);
      expect(
        screen.getByRole('heading', {
          name: 'Gran Rifa Copa Primavera - Estado Sincronizado',
          level: 1,
        })
      ).toBeInTheDocument();
      expect(screen.getByText('Cerrada')).toBeInTheDocument();
    });
  });

  it('Consola del torneo: recibe actualización de bracket en tiempo real y recarga al reconectarse', async () => {
    let llamadasBracket = 0;
    let bracketEnServidor = { ...bracketInicial };

    server.use(
      http.get(`${API_URL}/torneos/100`, () => {
        return HttpResponse.json(torneoInformacionMock);
      }),
      http.get(`${API_URL}/torneos/100/bracket`, () => {
        llamadasBracket++;
        return HttpResponse.json(bracketEnServidor);
      }),
      http.get(`${API_URL}/torneos/100/inscripciones`, () => {
        return HttpResponse.json({
          content: [],
          page: { size: 20, number: 0, totalElements: 0, totalPages: 0 },
        });
      }),
      http.get(`${API_URL}/partidos/torneo/100/objeciones`, () => {
        return HttpResponse.json([]);
      })
    );

    render(
      <MemoryRouter initialEntries={['/torneos/100/consola']}>
        <Routes>
          <Route path="/torneos/:id/consola" element={<TorneoConsolaPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Estructura del bracket')).toBeInTheDocument();
    expect(screen.getByText('Semifinal')).toBeInTheDocument();
    expect(llamadasBracket).toBe(1);

    // Evento de bracket en tiempo real
    mockEmitTorneoEvent(100, {
      tipo: 'BRACKET_ACTUALIZADO',
      torneoId: 100,
      bracket: bracketAvanzado,
    });

    await waitFor(() => {
      const halcones = screen.getAllByText('Halcones FC');
      expect(halcones.length).toBe(2);
    });

    // Desconectar y reconectar
    mockDisconnect();
    bracketEnServidor = { ...bracketAvanzado };
    mockReconnect();

    await waitFor(() => {
      expect(llamadasBracket).toBeGreaterThanOrEqual(2);
    });
  });
});
