import { describe, expect, it } from 'vitest';
import { http } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import { problema } from '../mocks/adminHandlers';
import { server } from '../mocks/server';
import { renderRuta } from '../test/renderRuta';

const ENTRADA_F5 = '/torneos/torneo-apertura-f5/inscripcion';

describe('accesos a la entrada de la inscripción', () => {
  it('sin sesión lleva a iniciar sesión y, al ingresar, vuelve a la inscripción', async () => {
    const { user, ubicacion } = await renderRuta(ENTRADA_F5, { usuario: 'anonimo' });
    await waitFor(() => expect(ubicacion()).toBe('/auth/login'));

    await user.type(await screen.findByLabelText('Usuario o email'), 'usuario');
    await user.type(screen.getByLabelText('Contraseña'), 'user123');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));

    await waitFor(() => expect(ubicacion()).toBe(ENTRADA_F5));
    expect(await screen.findByLabelText('Equipo')).toBeInTheDocument();
  });

  it('sin el permiso de inscripciones muestra el acceso denegado explicado para la inscripción', async () => {
    const { ubicacion } = await renderRuta(ENTRADA_F5, { usuario: 'sinPermiso' });

    await waitFor(() => expect(ubicacion()).toBe('/unauthorized'));
    expect(await screen.findByRole('heading', { name: 'Acceso Denegado' })).toBeInTheDocument();
    expect(screen.getByText(/no tiene habilitada la inscripción a torneos/)).toBeInTheDocument();
    // Nada del texto del backoffice
    expect(screen.queryByText(/módulo de administración/)).not.toBeInTheDocument();
    expect(screen.queryByText(/admin123/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Equipo')).not.toBeInTheDocument();
  });

  it('el acceso denegado del backoffice sigue explicando los permisos administrativos', async () => {
    const { ubicacion } = await renderRuta('/admin');

    await waitFor(() => expect(ubicacion()).toBe('/unauthorized'));
    expect(await screen.findByText(/módulo de administración/)).toBeInTheDocument();
    expect(screen.queryByText(/inscripción a torneos/)).not.toBeInTheDocument();
  });

  it('si la cuenta se bloquea al guardar, lo explica en la página y no avanza', async () => {
    server.use(
      http.post('*/torneos/:id/inscripciones', () =>
        problema(403, 'USUARIO_BLOQUEADO', 'La cuenta tiene un bloqueo vigente')
      )
    );
    const { user, ubicacion } = await renderRuta('/torneos/individual-gratis/inscripcion');
    await user.click(await screen.findByLabelText('Acepto el Reglamento y Código de Conducta'));

    await user.click(screen.getByRole('button', { name: 'Confirmar inscripción' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Tu cuenta, o la de un jugador de la nómina, tiene un bloqueo vigente');
    expect(ubicacion()).toBe('/torneos/individual-gratis/inscripcion');
  });
});
