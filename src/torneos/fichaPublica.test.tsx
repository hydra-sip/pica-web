import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { server } from '../mocks/server';
import { fechaHora } from '../shared/formato';
import { renderRuta } from '../test/renderRuta';
import { TorneoCard } from './components/TorneoCard';
import { TorneoDetalle, TorneoResumen } from './types/torneo';

const torneoCardMock: TorneoResumen = {
  id: 10,
  slug: 'torneo-card-test',
  nombre: 'Torneo Apertura 2026',
  descripcion: 'Torneo de fútbol 5 competitivo.',
  disciplina: 'Fútbol 5',
  formato: 'ELIMINACION_DIRECTA',
  modalidad: 'PRESENCIAL',
  tipoParticipante: 'EQUIPO',
  sede: 'Sede Central UNLu',
  estado: 'INSCRIPCION_ABIERTA',
  cupoMaximo: 16,
  cupoDisponible: 8,
  valorInscripcion: 5000,
  moneda: 'ARS',
  gastosAdministrativos: 500,
  pozoEstimado: 80000,
  cierreInscripcionEn: '2026-11-10T12:00:00Z',
  fechaInicio: '2026-11-15T09:30:00Z',
  fechaFin: '2026-11-16T18:00:00Z',
};

const torneoDetalleBase: TorneoDetalle = {
  id: 50,
  slug: 'torneo-ficha-test',
  nombre: 'Copa Ficha Pública 2026',
  descripcion: 'Torneo de prueba para la ficha pública.',
  disciplina: 'Fútbol 5',
  formato: 'ELIMINACION_DIRECTA',
  modalidad: 'PRESENCIAL',
  tipoParticipante: 'INDIVIDUAL',
  sede: 'Club UNLu Campo Central',
  estado: 'INSCRIPCION_ABIERTA',
  cupoMaximo: 16,
  cupoMinimo: 4,
  cupoDisponible: 8,
  tamanioEquipo: null,
  nominaMaxima: null,
  valorInscripcion: 5000,
  moneda: 'ARS',
  pctGastosAdministrativos: 10,
  gastosAdministrativos: 500,
  totalAPagar: 5500,
  pozoEstimado: 80000,
  premios: [{ puesto: 1, pct: 100, monto: 80000 }],
  cierreInscripcionEn: '2026-12-01T20:00:00Z',
  fechaInicio: '2026-12-05T10:00:00Z',
  fechaFin: '2026-12-06T19:30:00Z',
  reglamentoTexto: 'Reglamento oficial del torneo.',
  reglamentoUrl: null,
  reglamentoHash: null,
  organizador: {
    id: 4,
    nombreCompleto: 'Organizador Eventos',
    username: 'organizador',
  },
  publicadoEn: '2026-10-01T10:00:00Z',
};

describe('CE4-2 (PICA-303): Ficha pública del torneo', () => {
  describe('Criterio 1: Inicio y fin con hora en tarjeta y ficha', () => {
    it('la tarjeta del catálogo formatea fechaInicio y fechaFin con hora (fechaHora)', () => {
      render(
        <MemoryRouter>
          <TorneoCard torneo={torneoCardMock} />
        </MemoryRouter>
      );

      const inicioFormateado = fechaHora(torneoCardMock.fechaInicio);
      const finFormateado = fechaHora(torneoCardMock.fechaFin);

      expect(inicioFormateado).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);
      expect(finFormateado).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);

      expect(screen.getByText('Comienza:')).toBeInTheDocument();
      expect(screen.getByText(inicioFormateado)).toBeInTheDocument();
      expect(screen.getByText('Finaliza:')).toBeInTheDocument();
      expect(screen.getByText(finFormateado)).toBeInTheDocument();
    });

    it('la ficha pública muestra las fechas de inicio y fin formateadas con fechaHora', async () => {
      server.use(
        http.get('*/torneos/slug/torneo-ficha-test', () => {
          return HttpResponse.json(torneoDetalleBase);
        }),
        http.get('*/torneos/50/mi-proximo-partido', () => HttpResponse.json(null)),
        http.get('*/partidos/mi-proximo', () => HttpResponse.json(null)),
        http.get('*/inscripciones/mias', () => {
          return HttpResponse.json({
            content: [],
            page: { size: 10, number: 0, totalElements: 0, totalPages: 0 },
          });
        })
      );

      await renderRuta('/torneos/torneo-ficha-test', { usuario: 'anonimo' });

      expect(await screen.findByRole('heading', { name: torneoDetalleBase.nombre })).toBeInTheDocument();

      const inicioEsperado = fechaHora(torneoDetalleBase.fechaInicio);
      const finEsperado = fechaHora(torneoDetalleBase.fechaFin);

      expect(inicioEsperado).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);
      expect(finEsperado).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);

      expect(screen.getByText('Inicio del torneo')).toBeInTheDocument();
      expect(screen.getByText(inicioEsperado)).toBeInTheDocument();
      expect(screen.getByText('Fin estimado')).toBeInTheDocument();
      expect(screen.getByText(finEsperado)).toBeInTheDocument();
    });
  });

  describe('Criterio 2: El organizador no ve "Inscribirme", ve "Ir a la consola"', () => {
    it('cuando el usuario autenticado es el organizador del torneo, ve "Ir a la consola" que navega a /torneos/:id/consola', async () => {
      server.use(
        http.get('*/torneos/slug/torneo-ficha-test', () => {
          return HttpResponse.json(torneoDetalleBase);
        }),
        http.get('*/torneos/50/mi-proximo-partido', () => HttpResponse.json(null)),
        http.get('*/partidos/mi-proximo', () => HttpResponse.json(null)),
        http.get('*/inscripciones/mias', () => {
          return HttpResponse.json({
            content: [],
            page: { size: 10, number: 0, totalElements: 0, totalPages: 0 },
          });
        })
      );

      // El usuario 'sinPermiso' tiene username 'organizador' e id 4 en los mocks
      await renderRuta('/torneos/torneo-ficha-test', {
        usuario: 'sinPermiso',
      });

      expect(await screen.findByRole('heading', { name: torneoDetalleBase.nombre })).toBeInTheDocument();

      const btnConsola = await screen.findByRole('link', { name: 'Ir a la consola' });
      expect(btnConsola).toBeInTheDocument();
      expect(btnConsola).toHaveAttribute('href', '/torneos/50/consola');

      // No debe mostrar opciones de inscribirse
      expect(screen.queryByText(/Inscribirme al Torneo/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Inscribir a mi Equipo/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Iniciar Sesión para Inscribirme/i)).not.toBeInTheDocument();
    });
  });

  describe('Criterio 3: Si ya estoy inscripto, veo "Ver mi inscripción"', () => {
    it('cuando el usuario ya posee una inscripción activa, ve "Ver mi inscripción" apuntando a /inscripciones/:id', async () => {
      server.use(
        http.get('*/torneos/slug/torneo-ficha-test', () => {
          return HttpResponse.json(torneoDetalleBase);
        }),
        http.get('*/torneos/50/mi-proximo-partido', () => HttpResponse.json(null)),
        http.get('*/partidos/mi-proximo', () => HttpResponse.json(null)),
        http.get('*/inscripciones/mias', () => {
          return HttpResponse.json({
            content: [
              {
                id: 123,
                torneoId: 50,
                torneo: { id: 50, nombre: torneoDetalleBase.nombre, slug: torneoDetalleBase.slug },
                usuarioId: 1,
                estado: 'CONFIRMADA',
                creadoEn: '2026-10-15T12:00:00Z',
                modificadoEn: '2026-10-15T12:00:00Z',
              },
            ],
            page: { size: 10, number: 0, totalElements: 1, totalPages: 1 },
          });
        }),
        http.get('*/inscripciones/123', () => {
          return HttpResponse.json({
            id: 123,
            torneoId: 50,
            torneo: { id: 50, nombre: torneoDetalleBase.nombre, slug: torneoDetalleBase.slug },
            usuarioId: 1,
            estado: 'CONFIRMADA',
            creadoEn: '2026-10-15T12:00:00Z',
            modificadoEn: '2026-10-15T12:00:00Z',
          });
        }),
        http.get('*/inscripciones/123/resumen-pago', () => {
          return HttpResponse.json({
            inscripcionId: 123,
            torneo: { id: 50, nombre: torneoDetalleBase.nombre },
            monto: 5000,
            gastosAdministrativos: 500,
            total: 5500,
            moneda: 'ARS',
            cupoMaximo: 16,
            cupoDisponible: 8,
            cierreInscripcionEn: '2026-12-01T20:00:00Z',
          });
        }),
        http.get('*/inscripciones/123/reemplazos', () => HttpResponse.json([]))
      );

      const { user, ubicacion } = await renderRuta('/torneos/torneo-ficha-test', {
        usuario: 'participante',
      });

      expect(await screen.findByRole('heading', { name: torneoDetalleBase.nombre })).toBeInTheDocument();

      const btnMiInscripcion = await screen.findByRole('link', { name: 'Ver mi inscripción' });
      expect(btnMiInscripcion).toBeInTheDocument();
      expect(btnMiInscripcion).toHaveAttribute('href', '/inscripciones/123');

      // No muestra el botón de inscribirse
      expect(screen.queryByText(/Inscribirme al Torneo/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Inscribir a mi Equipo/i)).not.toBeInTheDocument();

      await user.click(btnMiInscripcion);
      await waitFor(() => {
        expect(ubicacion()).toBe('/inscripciones/123');
      });
    });
  });

  describe('Criterio 4: Con el cierre de la inscripción vencido, el botón se apaga', () => {
    it('cuando la fecha de cierre de inscripción venció, el botón se encuentra deshabilitado con "Inscripción cerrada"', async () => {
      const torneoVencido: TorneoDetalle = {
        ...torneoDetalleBase,
        cierreInscripcionEn: '2020-01-01T12:00:00Z',
        estado: 'INSCRIPCION_ABIERTA',
      };

      server.use(
        http.get('*/torneos/slug/torneo-ficha-test', () => {
          return HttpResponse.json(torneoVencido);
        }),
        http.get('*/torneos/50/mi-proximo-partido', () => HttpResponse.json(null)),
        http.get('*/partidos/mi-proximo', () => HttpResponse.json(null)),
        http.get('*/inscripciones/mias', () => {
          return HttpResponse.json({
            content: [],
            page: { size: 10, number: 0, totalElements: 0, totalPages: 0 },
          });
        })
      );

      await renderRuta('/torneos/torneo-ficha-test', { usuario: 'anonimo' });

      expect(await screen.findByRole('heading', { name: torneoVencido.nombre })).toBeInTheDocument();

      const btnCerrado = screen.getByRole('button', { name: 'Inscripción cerrada' });
      expect(btnCerrado).toBeInTheDocument();
      expect(btnCerrado).toBeDisabled();
      expect(screen.queryByText(/Inscribirme/i)).not.toBeInTheDocument();
    });

    it('cuando el estado es INSCRIPCION_CERRADA, el botón se encuentra deshabilitado con "Inscripción cerrada"', async () => {
      const torneoEstadoCerrado: TorneoDetalle = {
        ...torneoDetalleBase,
        estado: 'INSCRIPCION_CERRADA',
      };

      server.use(
        http.get('*/torneos/slug/torneo-ficha-test', () => {
          return HttpResponse.json(torneoEstadoCerrado);
        }),
        http.get('*/torneos/50/mi-proximo-partido', () => HttpResponse.json(null)),
        http.get('*/partidos/mi-proximo', () => HttpResponse.json(null)),
        http.get('*/inscripciones/mias', () => {
          return HttpResponse.json({
            content: [],
            page: { size: 10, number: 0, totalElements: 0, totalPages: 0 },
          });
        })
      );

      await renderRuta('/torneos/torneo-ficha-test', { usuario: 'anonimo' });

      expect(await screen.findByRole('heading', { name: torneoEstadoCerrado.nombre })).toBeInTheDocument();

      const btnCerrado = screen.getByRole('button', { name: 'Inscripción cerrada' });
      expect(btnCerrado).toBeInTheDocument();
      expect(btnCerrado).toBeDisabled();
    });
  });
});
