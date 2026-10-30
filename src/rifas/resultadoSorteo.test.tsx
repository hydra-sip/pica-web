import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { TicketDetalle } from '../api/rifaApi';
import { ResultadoSorteo } from './components/ResultadoSorteo';
import { resultadoDelTicket } from './formato';

const TICKET: TicketDetalle = {
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
  rifaEstado: 'SORTEADA',
  sorteadaEn: '2026-10-31T15:00:00Z',
  esComprador: true,
  ventanaReclamoAbierta: true,
  premiosGanados: [],
};

describe('HU-504 / T504-2: Resultado del sorteo en la rifa y en Mis tickets', () => {
  it('Muestra el número que ganó cada premio y los que quedaron sin ganador', () => {
    render(
      <MemoryRouter>
        <ResultadoSorteo
          rifaId={1}
          premios={[
            { puesto: 1, pct: 70, descripcion: 'Una bici', numeroGanador: 12 },
            { puesto: 2, pct: 30, descripcion: null, numeroGanador: null },
          ]}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Resultado del sorteo' })).toBeInTheDocument();
    expect(screen.getByText('#12')).toBeInTheDocument();
    expect(screen.getByText('Sin ganador')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Verificar el sorteo/ })).toHaveAttribute(
      'href',
      '/verificacion?tipo=RIFA&id=1'
    );
  });

  it('El ticket dice qué premio ganó, o que no ganó, recién con la rifa sorteada', () => {
    expect(resultadoDelTicket({ ...TICKET, rifaEstado: 'CERRADA' })).toBeNull();
    expect(resultadoDelTicket(TICKET)).toEqual({ texto: 'Esta vez no ganaste.', gano: false });
    expect(
      resultadoDelTicket({
        ...TICKET,
        premiosGanados: [{ puesto: 1, pct: 70, descripcion: null, numeroGanador: 12 }],
      })
    ).toEqual({ texto: '¡Ganaste el 1º premio con el #12!', gano: true });
  });
});
