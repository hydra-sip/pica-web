import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderRuta } from './renderRuta';

// Prueba del cimiento: una ruta real, con su layout, su sesión y datos que vienen de MSW.
describe('renderRuta', () => {
  it('muestra una ruta de la app con los datos del usuario logueado que responde MSW', async () => {
    await renderRuta('/mi-perfil');

    expect(await screen.findByDisplayValue('user@pica.edu.ar')).toBeInTheDocument();
  });
});
