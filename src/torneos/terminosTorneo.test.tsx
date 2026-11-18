import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { TorneoInformacion } from '../api/torneoApi';
import { server } from '../mocks/server';
import { TorneoFormPage } from './pages/TorneoFormPage';
import { TERMINOS_TORNEO } from './terminos';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

/** Un borrador con los pasos 1 y 2 completos, listo para el paso 3. */
const borrador: TorneoInformacion = {
  id: 9,
  nombre: 'Apertura F5',
  disciplina: 'Fútbol 5',
  descripcion: null,
  formato: 'ELIMINACION_DIRECTA',
  reglasGrupos: null,
  modalidad: 'PRESENCIAL',
  tipoParticipante: 'EQUIPO',
  sede: 'Club Mercedes',
  canchas: ['Cancha 1'],
  fechaInicio: '2030-12-01T15:00:00Z',
  fechaFin: null,
  cierreInscripcionEn: '2030-11-25T12:00:00Z',
  reglamentoTexto: 'Reglamento',
  cupoMaximo: 16,
  cupoMinimo: 4,
  tamanioEquipo: 5,
  nominaMaxima: 8,
  estado: 'BORRADOR',
  pasoPendiente: 3,
  reglamentoUrl: null,
  reglamentoHash: null,
  slug: null,
  esquemaHash: null,
  publicadoEn: null,
  inscripcionCerradaEn: null,
  listaHash: null,
  creadoEn: '2026-10-30T10:00:00Z',
  modificadoEn: '2026-10-30T10:00:00Z',
  camposBloqueados: [],
  checkinMinAntes: null,
  checkinDuracion: null,
  checkinSinPresentes: 'REPROGRAMAR',
  discordWebhook: null,
  economia: {
    valorInscripcion: 20000,
    moneda: 'ARS',
    pctGastosAdministrativos: 10,
    gastosAdministrativos: 2000,
    totalAPagar: 22000,
    premios: [{ puesto: 1, pct: 100 }],
  },
};

describe('PICA-449: Términos de custodia al publicar el torneo', () => {
  it('En el paso 3 se leen los términos arriba de la casilla', async () => {
    server.use(
      http.get(`${API_URL}/torneos/9`, () => HttpResponse.json(borrador)),
      http.get(`${API_URL}/torneos/9/gastos`, () => HttpResponse.json([])),
      http.get(`${API_URL}/torneos/opciones`, () =>
        HttpResponse.json({
          disciplinas: [],
          formatos: [],
          modalidades: ['PRESENCIAL', 'ONLINE'],
          cupoMaximo: 64,
          pctGastosAdministrativos: 10,
          margenCierreInicioMin: 60,
          checkinDuracionMaxMin: 60,
          canchas: [],
        })
      )
    );
    render(
      <MemoryRouter initialEntries={['/torneos/9/editar?paso=3']}>
        <Routes>
          <Route path="/torneos/:id/editar" element={<TorneoFormPage />} />
        </Routes>
      </MemoryRouter>
    );

    const casilla = await screen.findByRole('checkbox', {
      name: /Acepto los términos de custodia de fondos/,
    });
    const terminos = screen.getByRole('region', { name: 'Términos de custodia de fondos' });
    for (const seccion of TERMINOS_TORNEO) {
      expect(terminos).toHaveTextContent(seccion.titulo);
    }
    // el recuadro va arriba de la casilla
    expect(
      terminos.compareDocumentPosition(casilla) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: /Publicar/ })).toBeInTheDocument();
  });
});
