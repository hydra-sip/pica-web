import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ListaSellada } from './components/ListaSellada';

const HASH = 'a3f1c9e07b5d4e2f8a6b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f';

describe('HU-407 / T407-2: Rifa cerrada con su hash', () => {
  it('Muestra la fecha del sellado y el hash completo de la lista', () => {
    render(<ListaSellada listaHash={HASH} listaSelladaEn="2026-10-30T15:30:00Z" />);

    expect(screen.getByRole('heading', { name: 'Lista sellada' })).toBeInTheDocument();
    expect(screen.getByText(HASH)).toBeInTheDocument();
    expect(screen.getByText('Fecha del sellado').nextSibling).toHaveTextContent('30/10/2026');
  });
});
