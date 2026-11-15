import { act, render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { BracketTorneo, GruposTorneo } from '../api/torneoApi';
import { server } from '../mocks/server';
import { mockEmitTorneoEvent } from '../realtime/websocketService';
import { BracketDelTorneo } from './components/BracketDelTorneo';
import { GruposPublicos } from './components/GruposPublicos';

const fila = (inscripcionId: number, nombre: string, posicion: number, puntos: number) => ({
  inscripcionId,
  nombre,
  posicion,
  jugados: 1,
  ganados: puntos === 3 ? 1 : 0,
  empatados: 0,
  perdidos: puntos === 3 ? 0 : 1,
  aFavor: puntos === 3 ? 2 : 0,
  enContra: puntos === 3 ? 0 : 2,
  diferencia: puntos === 3 ? 2 : -2,
  puntos,
  criterio: 'PUNTOS' as const,
  clasifica: posicion <= 2,
});

const grupos = (puntosDeAna: number): GruposTorneo => ({
  torneoId: 77,
  reglas: { tamanioGrupo: 4, clasificanPorGrupo: 2, puntosVictoria: 3, puntosEmpate: 1 },
  desempate: 'puntos,entre-si,ganados,partido',
  grupos: [
    {
      letra: 'A',
      terminado: false,
      tabla: [fila(1, 'Ana', 1, puntosDeAna), fila(2, 'Beto', 2, 0)],
      partidos: [],
      desempate: [],
      desempatesPendientes: [],
    },
  ],
});

const LLAVE_VACIA: BracketTorneo = {
  torneoId: 77,
  semilla: 'ab'.repeat(32),
  listaHash: null,
  rondas: [{ numero: 1, nombre: 'Final', partidos: [] }],
};

describe('los grupos en la ficha pública (CR-02-8)', () => {
  it('muestran la tabla, el enlace al portal y se actualizan con cada resultado', async () => {
    let puntos = 0;
    server.use(http.get('*/torneos/77/grupos', () => HttpResponse.json(grupos(puntos))));
    render(<GruposPublicos torneoId={77} />);

    expect(await screen.findByRole('heading', { name: 'Grupo A' })).toBeInTheDocument();
    expect(screen.getByTestId('link-verificar-grupos')).toHaveAttribute(
      'href',
      '/verificacion?tipo=grupos&id=77'
    );
    expect(screen.getAllByRole('cell', { name: '0' }).length).toBeGreaterThan(0);

    puntos = 3;
    act(() => {
      mockEmitTorneoEvent(77, { tipo: 'RESULTADO_CONFIRMADO', torneoId: 77 });
    });

    expect(await screen.findByRole('cell', { name: '3' })).toBeInTheDocument();
  });

  it('la llave de un torneo con grupos no ofrece verificar un sorteo: los cruces son fijos', async () => {
    server.use(http.get('*/torneos/77/bracket', () => HttpResponse.json(LLAVE_VACIA)));
    render(<BracketDelTorneo torneoId={77} conGrupos />);

    expect(await screen.findByText('Llave')).toBeInTheDocument();
    expect(screen.getByText(/Cruces fijos/)).toBeInTheDocument();
    expect(screen.queryByTestId('link-verificar-bracket')).not.toBeInTheDocument();
  });
});
