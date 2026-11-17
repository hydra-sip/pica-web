import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { renderRuta } from '../test/renderRuta';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

// HU-703: soporte bloquea y desbloquea desde la lista de usuarios, con motivo y duración

// Los mocks del admin no se reinician entre tests: solo el primero bloquea de verdad (a jperez); los errores
// se simulan con un handler propio
describe('backoffice: bloqueo de usuarios (HU-703)', () => {
  it('soporte entra a la lista de usuarios y bloquea con motivo, sin poder editar ni resetear', async () => {
    const { user } = await renderRuta('/admin/usuarios', { usuario: 'soporte' });
    const fila = (await screen.findByText('@jperez')).closest('tr')!;

    expect(within(fila).queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();
    await user.click(within(fila).getByRole('button', { name: 'Bloquear' }));
    const modal = screen.getByRole('dialog');
    await user.selectOptions(within(modal).getByRole('combobox'), 'Indefinido');
    expect(within(modal).getByText('Hasta que se levante.')).toBeInTheDocument();
    await user.type(within(modal).getByRole('textbox'), 'Incumple las condiciones de uso');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await user.type(screen.getByPlaceholderText('BLOQUEAR'), 'BLOQUEAR');
    await user.click(screen.getByRole('button', { name: 'Aplicar bloqueo' }));

    const bloqueada = (await screen.findByText('@jperez')).closest('tr')!;
    expect(await within(bloqueada).findByRole('button', { name: 'Motivo' })).toBeInTheDocument();
  });

  it('soporte levanta un bloqueo desde el motivo', async () => {
    const { user } = await renderRuta('/admin/usuarios', { usuario: 'soporte' });
    const fila = (await screen.findByText('@lfernandez')).closest('tr')!;

    await user.click(within(fila).getByRole('button', { name: 'Motivo' }));

    expect(await screen.findByRole('button', { name: /levantar/i })).toBeInTheDocument();
  });

  it('sin el permiso de bloqueo no aparece el botón Bloquear', async () => {
    // el organizador de los mocks ve usuarios pero no bloquea
    await renderRuta('/admin/usuarios', { usuario: 'organizador' });
    const fila = (await screen.findByText('@jperez')).closest('tr')!;

    expect(within(fila).queryByRole('button', { name: 'Bloquear' })).not.toBeInTheDocument();
  });

  it('si otro lo bloqueó mientras tanto, el modal muestra el error del back', async () => {
    server.use(
      http.post(`${API_URL}/admin/usuarios/:id/bloqueo`, () =>
        HttpResponse.json(
          {
            status: 409,
            codigo: 'USUARIO_YA_BLOQUEADO',
            detail: 'El usuario mgarcia ya está bloqueado',
          },
          { status: 409 }
        )
      )
    );
    const { user } = await renderRuta('/admin/usuarios', { usuario: 'soporte' });
    const fila = (await screen.findByText('@mgarcia')).closest('tr')!;
    await user.click(within(fila).getByRole('button', { name: 'Bloquear' }));
    await user.type(
      within(screen.getByRole('dialog')).getByRole('textbox'),
      'Incumple las condiciones de uso'
    );
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await user.type(screen.getByPlaceholderText('BLOQUEAR'), 'BLOQUEAR');
    await user.click(screen.getByRole('button', { name: 'Aplicar bloqueo' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('El usuario ya está bloqueado.');
  });

  it('si el usuario ya no existe, el modal muestra el error del back', async () => {
    server.use(
      http.post(`${API_URL}/admin/usuarios/:id/bloqueo`, () =>
        HttpResponse.json(
          { status: 404, codigo: 'USUARIO_NO_ENCONTRADO', detail: 'No existe el usuario 3' },
          { status: 404 }
        )
      )
    );
    const { user } = await renderRuta('/admin/usuarios', { usuario: 'soporte' });
    const fila = (await screen.findByText('@mgarcia')).closest('tr')!;
    await user.click(within(fila).getByRole('button', { name: 'Bloquear' }));
    await user.type(
      within(screen.getByRole('dialog')).getByRole('textbox'),
      'Incumple las condiciones de uso'
    );
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await user.type(screen.getByPlaceholderText('BLOQUEAR'), 'BLOQUEAR');
    await user.click(screen.getByRole('button', { name: 'Aplicar bloqueo' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El usuario no existe o está dado de baja.'
    );
  });
});
