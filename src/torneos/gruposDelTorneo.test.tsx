import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { GruposTorneo, PartidoBracket } from '../api/torneoApi';
import { server } from '../mocks/server';
import { erroresDelMarcador, MARCADOR_VACIO, payloadDelMarcador } from '../partidos/marcador';
import { GruposDelTorneo } from './components/GruposDelTorneo';

const partido = (id: number, ronda: number, local: string, visitante: string): PartidoBracket => ({
  id,
  ronda,
  posicion: 1,
  estado: 'CONFIRMADO',
  bye: false,
  local: { inscripcionId: id * 10, nombre: local, puntaje: 1, penales: null, ganador: false },
  visitante: {
    inscripcionId: id * 10 + 1,
    nombre: visitante,
    puntaje: 1,
    penales: null,
    ganador: false,
  },
  cancha: null,
  fechaProgramada: null,
  arbitro: 'Mario Gómez',
});

const GRUPOS: GruposTorneo = {
  torneoId: 9,
  reglas: { tamanioGrupo: 4, clasificanPorGrupo: 2, puntosVictoria: 3, puntosEmpate: 1 },
  desempate: 'puntos,entre-si,ganados,partido',
  grupos: [
    {
      letra: 'A',
      terminado: false,
      tabla: [
        {
          inscripcionId: 1,
          nombre: 'Los Galácticos',
          posicion: 1,
          jugados: 2,
          ganados: 1,
          empatados: 1,
          perdidos: 0,
          aFavor: 3,
          enContra: 1,
          diferencia: 2,
          puntos: 4,
          criterio: 'ENTRE_SI',
          clasifica: true,
        },
        {
          inscripcionId: 2,
          nombre: 'Dep. Luján',
          posicion: 2,
          jugados: 2,
          ganados: 1,
          empatados: 1,
          perdidos: 0,
          aFavor: 2,
          enContra: 1,
          diferencia: 1,
          puntos: 4,
          criterio: 'ENTRE_SI',
          clasifica: true,
        },
      ],
      partidos: [
        partido(1, 1, 'Los Galácticos', 'Dep. Luján'),
        partido(2, 2, 'Dep. Luján', 'Atlas'),
      ],
      desempate: [],
      desempatesPendientes: [],
    },
  ],
};

const conGrupos = (grupos: GruposTorneo) =>
  server.use(http.get('*/torneos/9/grupos', () => HttpResponse.json(grupos)));

describe('la fase de grupos (CR-02-7)', () => {
  it('muestra la tabla con quiénes pasan y por qué, y los partidos por fecha', async () => {
    conGrupos(GRUPOS);
    render(
      <MemoryRouter>
        <GruposDelTorneo torneoId={9} conEnlaces />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Grupo A' })).toBeInTheDocument();
    expect(screen.getByText(/Grupos de 4, pasan 2 por grupo/)).toBeInTheDocument();
    expect(screen.getAllByText('por resultado entre sí')).toHaveLength(2);
    expect(screen.getAllByText(/· pasa/)).toHaveLength(2);
    expect(screen.getByRole('heading', { name: 'Fecha 1' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Fecha 2' })).toBeInTheDocument();
    expect(screen.getAllByRole('link')[0]).toHaveAttribute('href', '/partidos/1');
  });

  it('sin sortear, avisa que los grupos salen de drand', async () => {
    conGrupos({ ...GRUPOS, grupos: [] });
    render(
      <MemoryRouter>
        <GruposDelTorneo torneoId={9} />
      </MemoryRouter>
    );

    expect(await screen.findByText(/semilla de drand que nadie elige/)).toBeInTheDocument();
  });

  it('con un empate pendiente avisa que se juega un partido de desempate', async () => {
    const grupo = { ...GRUPOS.grupos[0], terminado: true, desempatesPendientes: [[1, 2]] };
    conGrupos({ ...GRUPOS, grupos: [grupo] });
    render(
      <MemoryRouter>
        <GruposDelTorneo torneoId={9} />
      </MemoryRouter>
    );

    expect(await screen.findByText(/se juega un partido de desempate/)).toBeInTheDocument();
  });
});

describe('el marcador de un partido de grupos (CR-02-7)', () => {
  const empate = { ...MARCADOR_VACIO, local: '1', visitante: '1' };

  it('en grupos se puede empatar sin penales', () => {
    expect(erroresDelMarcador(empate, true)).toEqual({});
    expect(payloadDelMarcador(empate, true)).toEqual({
      puntajeLocal: 1,
      puntajeVisitante: 1,
      penalesLocal: null,
      penalesVisitante: null,
    });
  });

  it('en la llave el empate sigue pidiendo penales', () => {
    expect(erroresDelMarcador(empate).penalesLocal).toBeDefined();
  });
});
