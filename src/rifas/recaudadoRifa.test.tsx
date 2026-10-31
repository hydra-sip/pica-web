import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RecaudadoRifa } from './components/RecaudadoRifa';

describe('HU-405 / T405-2: Lo recaudado de la rifa', () => {
  it('Con torneo, muestra cuánto va al pozo del torneo y cuánto a los premios', () => {
    render(
      <RecaudadoRifa
        titulo="Lo recaudado"
        reparto={{ recaudado: 3000, alPozoTorneo: 900, aPremios: 2100 }}
        torneoNombre="Copa abierta"
        pctDestinadoTorneo={30}
        vendidos="6 de 100"
      />
    );

    expect(screen.getByText('6 de 100')).toBeInTheDocument();
    expect(screen.getByText('Recaudado').nextSibling).toHaveTextContent('3.000,00');
    expect(screen.getByText('Al pozo del torneo Copa abierta (30%)').nextSibling).toHaveTextContent(
      '900,00'
    );
    expect(screen.getByText('A premios (70%)').nextSibling).toHaveTextContent('2.100,00');
  });

  it('Sin torneo, todo va a los premios', () => {
    render(
      <RecaudadoRifa
        titulo="Lo recaudado"
        reparto={{ recaudado: 3000, alPozoTorneo: 0, aPremios: 3000 }}
        torneoNombre={null}
        pctDestinadoTorneo={0}
      />
    );

    expect(screen.queryByText(/Al pozo del torneo/)).not.toBeInTheDocument();
    expect(screen.getByText('A premios').nextSibling).toHaveTextContent('3.000,00');
  });

  it('Quien compra ve el monto acumulado sin la cantidad de números vendidos', () => {
    render(
      <RecaudadoRifa
        titulo="Monto acumulado"
        reparto={{ recaudado: 1000, alPozoTorneo: 200, aPremios: 800 }}
        torneoNombre="Copa abierta"
        pctDestinadoTorneo={20}
      />
    );

    expect(screen.getByRole('heading', { name: 'Monto acumulado' })).toBeInTheDocument();
    expect(screen.queryByText('Números vendidos')).not.toBeInTheDocument();
    expect(screen.getByText('A premios (80%)').nextSibling).toHaveTextContent('800,00');
  });
});
