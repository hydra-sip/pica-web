import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderRuta } from '../test/renderRuta';

const RUTAS = [
  '/torneos/torneo-apertura-f5/inscripcion',
  '/inscripciones/1/nomina',
  '/inscripciones/1/pago',
];

// Esperar a que termine de verificar la sesión y los permisos antes de mirar dónde se cayó.
const sesionResuelta = () =>
  waitFor(() =>
    expect(
      screen.queryByText(/Verificando autenticación|Validando permisos/)
    ).not.toBeInTheDocument()
  );

describe('rutas de la inscripción', () => {
  it.each(RUTAS)('el participante entra a %s', async (ruta) => {
    const { ubicacion } = await renderRuta(ruta);
    await sesionResuelta();

    expect(ubicacion()).toBe(ruta);
    expect(screen.queryByText('Página no encontrada')).not.toBeInTheDocument();
  });

  it.each(RUTAS)('un usuario sin INSCRIPCION_GESTIONAR no entra a %s', async (ruta) => {
    const { ubicacion } = await renderRuta(ruta, { usuario: 'sinPermiso' });

    await waitFor(() => expect(ubicacion()).toBe('/unauthorized'));
  });

  it.each(RUTAS)('sin sesión, %s lleva a iniciar sesión', async (ruta) => {
    const { ubicacion } = await renderRuta(ruta, { usuario: 'anonimo' });

    await waitFor(() => expect(ubicacion()).toBe('/auth/login'));
  });
});
