import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { authApi } from '../api/authApi';
import { partidoApi, ObjecionComparada } from '../api/partidoApi';
import { ComparativoObjecion } from '../partidos/components/ComparativoObjecion';
import { renderRuta } from '../test/renderRuta';

describe('RNF-AUD-01: Auditoría de solo agregado y visualización de solo lectura', () => {
  it('en el historial del partido (sacado de la auditoría) los eventos se muestran en orden y sin controles de modificación ni borrado', () => {
    const mockComparada: ObjecionComparada = {
      partidoId: 42,
      torneoId: 10,
      estado: 'OBJETADO',
      cargada: {
        lado: 'LOCAL',
        equipo: 'Los Halcones',
        puntajeLocal: 2,
        puntajeVisitante: 1,
        penalesLocal: null,
        penalesVisitante: null,
        fecha: '2026-11-04T10:00:00Z',
        evidencias: [],
      },
      objetada: {
        lado: 'VISITANTE',
        equipo: 'Las Panteras',
        puntajeLocal: 1,
        puntajeVisitante: 1,
        penalesLocal: null,
        penalesVisitante: null,
        fecha: '2026-11-04T10:15:00Z',
        evidencias: [],
      },
      motivo: 'El gol sobre la hora no fue válido',
      laudo: null,
      historial: [
        {
          evento: 'PROGRAMADO',
          usuario: 'Organizador Mercedes',
          lado: null,
          equipo: null,
          fecha: '2026-11-01T12:00:00Z',
          decision: null,
          fechaProgramada: '2026-11-04T18:00:00Z',
        },
        {
          evento: 'CHECKIN',
          usuario: 'Capitán Halcones',
          lado: 'LOCAL',
          equipo: 'Los Halcones',
          fecha: '2026-11-04T17:45:00Z',
          decision: null,
          fechaProgramada: null,
        },
        {
          evento: 'CARGADO',
          usuario: 'Capitán Halcones',
          lado: 'LOCAL',
          equipo: 'Los Halcones',
          fecha: '2026-11-04T19:30:00Z',
          decision: null,
          fechaProgramada: null,
        },
        {
          evento: 'OBJETADO',
          usuario: 'Capitán Panteras',
          lado: 'VISITANTE',
          equipo: 'Las Panteras',
          fecha: '2026-11-04T19:40:00Z',
          decision: null,
          fechaProgramada: null,
        },
      ],
    };

    const { container } = render(
      <ComparativoObjecion partidoId={42} comparada={mockComparada} />
    );

    const seccionHistorial = container.querySelector('.comparativo-historial');
    expect(seccionHistorial).toBeInTheDocument();

    const items = seccionHistorial!.querySelectorAll('ol > li');
    expect(items).toHaveLength(4);

    // Los eventos aparecen en orden cronológico tal como provienen de la auditoría
    expect(items[0]).toHaveTextContent('Organizador Mercedes programó el partido');
    expect(items[1]).toHaveTextContent('Capitán Halcones (Los Halcones) hizo check-in');
    expect(items[2]).toHaveTextContent('Capitán Halcones (Los Halcones) cargó el resultado');
    expect(items[3]).toHaveTextContent('Capitán Panteras (Las Panteras) objetó el resultado');

    // La auditoría es estrictamente inmutable: no hay botones ni controles para modificar ni borrar
    const botones = within(seccionHistorial as HTMLElement).queryAllByRole('button');
    expect(botones).toHaveLength(0);

    const inputs = within(seccionHistorial as HTMLElement).queryAllByRole('textbox');
    expect(inputs).toHaveLength(0);

    expect(seccionHistorial).not.toHaveTextContent(/eliminar/i);
    expect(seccionHistorial).not.toHaveTextContent(/borrar/i);
    expect(seccionHistorial).not.toHaveTextContent(/modificar/i);
    expect(seccionHistorial).not.toHaveTextContent(/editar/i);
  });

  it('en el panel de administración, la tabla de auditoría criptográfica es de solo lectura y no expone acciones de modificación ni borrado', async () => {
    await renderRuta('/admin', {
      usuario: 'anonimo',
      prepara: async () => {
        await authApi.login('admin', 'admin123');
      },
    });

    // Se visualiza la sección de auditoría
    expect(
      await screen.findByText('Actividad Reciente y Auditoría Criptográfica')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Registros inmutables firmados con hash SHA-256 para validación de transparencia.')
    ).toBeInTheDocument();

    const tabla = document.querySelector('.tabla-auditoria');
    expect(tabla).toBeInTheDocument();

    // Las cabeceras corresponden únicamente a columnas de lectura de auditoría
    const headers = within(tabla as HTMLElement).getAllByRole('columnheader');
    const textosHeaders = headers.map((h) => h.textContent);
    expect(textosHeaders).toEqual([
      'EVENTO / ACCIÓN',
      'ACTOR',
      'HASH SHA-256',
      'FECHA / HORA',
      'ESTADO',
    ]);
    expect(textosHeaders).not.toContain('ACCIONES');
    expect(textosHeaders).not.toContain('ACCIONES DISPONIBLES');

    // Filas de eventos auditados presentes
    const filas = within(tabla as HTMLElement).getAllByRole('row');
    // 1 header + 4 registros auditados
    expect(filas.length).toBeGreaterThanOrEqual(5);

    // No existen controles interactivos de edición ni borrado en la tabla
    const botonesTabla = within(tabla as HTMLElement).queryAllByRole('button');
    expect(botonesTabla).toHaveLength(0);

    const inputsTabla = within(tabla as HTMLElement).queryAllByRole('textbox');
    expect(inputsTabla).toHaveLength(0);

    expect(tabla).not.toHaveTextContent(/eliminar/i);
    expect(tabla).not.toHaveTextContent(/borrar/i);
    expect(tabla).not.toHaveTextContent(/editar/i);
    expect(tabla).not.toHaveTextContent(/modificar/i);
  });

  it('el cliente de API de partidos (partidoApi) no expone métodos para modificar o borrar registros de auditoría', () => {
    const metodos = Object.keys(partidoApi);

    // Asegurarse de que no existan métodos para eliminar o alterar auditoría
    const metodosPeligrosos = metodos.filter((m) =>
      /borrar|eliminar|delete|modificar|update.*audit|audit.*mod|historial.*del/i.test(m)
    );
    expect(metodosPeligrosos).toEqual([]);
  });
});

