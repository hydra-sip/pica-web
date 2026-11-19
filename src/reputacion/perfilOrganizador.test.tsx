import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { PerfilOrganizador } from '../api/perfilOrganizadorApi';
import { server } from '../mocks/server';
import { renderRuta } from '../test/renderRuta';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

describe('HU-806 / PICA-430: Perfil público del organizador', () => {
  it('Criterio 1: muestra contadores en cero e índice inicial para un organizador sin torneos (público sin login)', async () => {
    await renderRuta('/organizadores/30', { usuario: 'anonimo' });

    expect(await screen.findByRole('heading', { name: 'Organizador 30' })).toBeInTheDocument();
    expect(screen.getByText('@organizador_30')).toBeInTheDocument();
    expect(screen.getByLabelText('Índice del organizador 100, alto')).toHaveTextContent('100');

    const historial = screen.getByRole('region', { name: 'Historial de torneos del organizador' });
    const organizados = within(historial).getByText('Torneos organizados').closest('article')!;
    const finalizados = within(historial).getByText('Torneos finalizados').closest('article')!;
    const cancelados = within(historial).getByText('Torneos cancelados').closest('article')!;

    expect(organizados).toHaveTextContent('0');
    expect(finalizados).toHaveTextContent('0');
    expect(cancelados).toHaveTextContent('0');
    expect(
      screen.getByText('No tiene torneos próximos publicados en este momento.')
    ).toBeInTheDocument();
  });

  it('Criterios 2 y 3: muestra contadores actualizados, índice disminuido por cancelaciones y torneos próximos', async () => {
    const perfilActualizado: PerfilOrganizador = {
      id: 7,
      username: 'claudia_org',
      nombreCompleto: 'Claudia Organizadora',
      avatar: null,
      torneosOrganizados: 5,
      torneosFinalizados: 2,
      torneosCancelados: 2,
      indice: 55,
      indiceActualizadoEn: '2026-11-18T16:00:00Z',
      historialIndice: [
        {
          torneoId: 12,
          torneo: 'Copa Invierno',
          conGastos: true,
          delta: -30,
          valorResultante: 55,
          creadoEn: '2026-11-18T16:00:00Z',
        },
        {
          torneoId: 11,
          torneo: 'Copa Otoño',
          conGastos: false,
          delta: -15,
          valorResultante: 85,
          creadoEn: '2026-11-10T14:00:00Z',
        },
      ],
      torneosProximos: [
        {
          id: 20,
          slug: 'copa-primavera',
          nombre: 'Copa Primavera F5',
          descripcion: 'Torneo de primavera',
          disciplina: 'Fútbol 5',
          formato: 'ELIMINACION_DIRECTA',
          modalidad: 'PRESENCIAL',
          tipoParticipante: 'EQUIPO',
          sede: 'Sede Central',
          estado: 'INSCRIPCION_ABIERTA',
          cupoMaximo: 16,
          cupoDisponible: 6,
          valorInscripcion: 4000,
          moneda: 'ARS',
          gastosAdministrativos: 400,
          pozoEstimado: 58000,
          cierreInscripcionEn: '2026-11-28T20:00:00Z',
          fechaInicio: '2026-12-01T10:00:00Z',
          fechaFin: null,
          organizador: { id: 7, nombreCompleto: 'Claudia Organizadora', username: 'claudia_org' },
        },
      ],
    };

    server.use(
      http.get(`${API_URL}/usuarios/7/perfil-organizador`, () =>
        HttpResponse.json(perfilActualizado)
      )
    );

    await renderRuta('/organizadores/7', { usuario: 'anonimo' });

    expect(await screen.findByRole('heading', { name: 'Claudia Organizadora' })).toBeInTheDocument();
    expect(screen.getByLabelText('Índice del organizador 55, medio')).toHaveClass('indice-medio');

    const historial = screen.getByRole('region', { name: 'Historial de torneos del organizador' });
    expect(within(historial).getByText('Torneos organizados').closest('article')).toHaveTextContent(
      '5'
    );
    expect(within(historial).getByText('Torneos finalizados').closest('article')).toHaveTextContent(
      '2'
    );
    expect(within(historial).getByText('Torneos cancelados').closest('article')).toHaveTextContent(
      '2'
    );

    const tablaMovimientos = screen.getByRole('table', {
      name: 'Historial del índice del organizador',
    });
    expect(tablaMovimientos).toHaveTextContent('Copa Invierno');
    expect(tablaMovimientos).toHaveTextContent('Cancelación con gastos');
    expect(tablaMovimientos).toHaveTextContent('−30');
    expect(tablaMovimientos).toHaveTextContent('Cancelación sin gastos');
    expect(tablaMovimientos).toHaveTextContent('−15');

    expect(screen.getByRole('link', { name: 'Copa Primavera F5' })).toHaveAttribute(
      'href',
      '/torneos/copa-primavera'
    );
  });

  it('Criterio 4: permite abrir el perfil del organizador desde la ficha pública del torneo', async () => {
    const user = userEvent.setup();
    await renderRuta('/torneos/dev-copa-abierta', { usuario: 'anonimo' });

    const linkOrganizador = await screen.findByRole('link', { name: 'Dev Organizador' });
    expect(linkOrganizador).toHaveAttribute('href', '/organizadores/2');

    await user.click(linkOrganizador);

    expect(await screen.findByRole('heading', { name: 'Dev Organizador' })).toBeInTheDocument();
    expect(screen.getByText('@dev_organizador')).toBeInTheDocument();
    const historial = screen.getByRole('region', { name: 'Historial de torneos del organizador' });
    expect(within(historial).getByText('Torneos organizados').closest('article')).toHaveTextContent(
      '5'
    );
    expect(within(historial).getByText('Torneos finalizados').closest('article')).toHaveTextContent(
      '1'
    );
    expect(screen.getByRole('link', { name: 'Copa abierta' })).toHaveAttribute(
      'href',
      '/torneos/dev-copa-abierta'
    );
  });

  it('las tarjetas del catálogo enlazan al perfil del organizador', async () => {
    await renderRuta('/torneos', { usuario: 'anonimo' });

    const enlaces = await screen.findAllByRole('link', { name: 'Dev Organizador' });
    expect(enlaces.length).toBeGreaterThan(0);
    expect(enlaces[0]).toHaveAttribute('href', '/organizadores/2');
  });

  it('muestra alerta si el organizador no existe (404)', async () => {
    await renderRuta('/organizadores/999', { usuario: 'anonimo' });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El usuario no existe o está dado de baja.'
    );
  });
});
