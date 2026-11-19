import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../mocks/server';
import { renderRuta } from '../test/renderRuta';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

/** Lo que llega en el POST /auth/registro. */
const espiarRegistro = () => {
  const enviados: unknown[] = [];
  server.use(
    http.post(`${API_URL}/auth/registro`, async ({ request }) => {
      enviados.push(await request.json());
      return HttpResponse.json({ id: 99 }, { status: 201 });
    })
  );
  return enviados;
};

describe('PICA-451: Registro con el UI kit', () => {
  it('Tiene la cabecera, las pestañas, Google y el separador, como el login', async () => {
    await renderRuta('/auth/register', { usuario: 'anonimo' });

    expect(await screen.findByRole('link', { name: 'Registrarse' })).toHaveClass('active');
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeInTheDocument();
    expect(screen.getByText('o con email')).toBeInTheDocument();
    expect(screen.getByText(/Política de Privacidad/)).toBeInTheDocument();
  });

  it('Completar el formulario manda todos los campos y lleva a revisar el correo', async () => {
    const enviados = espiarRegistro();
    const { user, ubicacion } = await renderRuta('/auth/register', { usuario: 'anonimo' });

    await user.type(await screen.findByLabelText(/Nombre\/s/), 'Juan');
    await user.type(screen.getByLabelText(/Apellido\/s/), 'Pérez');
    await user.type(screen.getByLabelText(/Nombre de usuario/), 'juanperez');
    await user.type(screen.getByLabelText(/Correo electrónico/i), 'juan@correo.com');
    await user.selectOptions(screen.getByLabelText(/Tipo/), 'DNI');
    await user.type(screen.getByLabelText(/Número de documento/), '38123456');
    fireEvent.change(screen.getByLabelText(/Fecha de nacimiento/), {
      target: { value: '1995-04-20' },
    });
    await user.type(screen.getByLabelText(/^Contraseña/), 'Clave1234');
    await user.type(screen.getByLabelText(/Confirmar contraseña/), 'Clave1234');
    await user.click(screen.getByLabelText('Acepto las Bases y Condiciones'));
    await user.click(screen.getByRole('button', { name: 'Registrarse' }));

    await waitFor(() => expect(ubicacion()).toBe('/auth/check-email'));
    expect(enviados).toEqual([
      {
        username: 'juanperez',
        email: 'juan@correo.com',
        password: 'Clave1234',
        nombres: 'Juan',
        apellidos: 'Pérez',
        tipoDoc: 'DNI',
        nroDoc: '38123456',
        fechaNacimiento: '1995-04-20',
      },
    ]);
  });

  it('Un formulario incompleto muestra el error de cada campo y no se manda', async () => {
    const enviados = espiarRegistro();
    const { user } = await renderRuta('/auth/register', { usuario: 'anonimo' });

    await user.click(await screen.findByRole('button', { name: 'Registrarse' }));

    for (const [campo, error] of [
      [/Nombre\/s/, /El nombre/],
      [/Apellido\/s/, /El apellido/],
      [/Nombre de usuario/, 'El nombre de usuario debe tener al menos 3 caracteres'],
      [/Correo electrónico/i, /Ingresá un correo electrónico válido/],
      [/Número de documento/, /.+/],
      [/Fecha de nacimiento/, /.+/],
      [/^Contraseña/, /.+/],
      [/Confirmar contraseña/, 'Confirmá tu contraseña'],
    ] as const) {
      const control = screen.getByLabelText(campo);
      expect(control).toHaveAttribute('aria-invalid', 'true');
      expect(control).toHaveAccessibleDescription(error);
    }
    expect(
      screen.getByText('Debes aceptar las Bases y Condiciones para continuar')
    ).toBeInTheDocument();
    expect(enviados).toEqual([]);
  });

  it('Un correo ya registrado se marca en el campo', async () => {
    const { user } = await renderRuta('/auth/register', { usuario: 'anonimo' });

    await user.type(await screen.findByLabelText(/Nombre\/s/), 'Juan');
    await user.type(screen.getByLabelText(/Apellido\/s/), 'Pérez');
    await user.type(screen.getByLabelText(/Nombre de usuario/), 'juanperez');
    await user.type(screen.getByLabelText(/Correo electrónico/i), 'existente@pica.edu.ar');
    await user.type(screen.getByLabelText(/Número de documento/), '38123456');
    fireEvent.change(screen.getByLabelText(/Fecha de nacimiento/), {
      target: { value: '1995-04-20' },
    });
    await user.type(screen.getByLabelText(/^Contraseña/), 'Clave1234');
    await user.type(screen.getByLabelText(/Confirmar contraseña/), 'Clave1234');
    await user.click(screen.getByLabelText('Acepto las Bases y Condiciones'));
    await user.click(screen.getByRole('button', { name: 'Registrarse' }));

    expect(await screen.findByLabelText(/Correo electrónico/i)).toHaveAccessibleDescription(
      'Este correo electrónico ya se encuentra registrado.'
    );
  });
});
