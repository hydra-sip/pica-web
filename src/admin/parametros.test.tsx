import { screen, within } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { authApi } from '../api/authApi';
import { server } from '../mocks/server';
import { renderRuta } from '../test/renderRuta';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const comoAdmin = (ruta: string) =>
  renderRuta(ruta, {
    usuario: 'anonimo',
    prepara: async () => {
      await authApi.login('admin', 'admin123');
    },
  });

/** Guarda el cuerpo de cada PUT y lo deja pasar al mock de parámetros. */
const espiarGuardado = () => {
  const cuerpos: unknown[] = [];
  server.use(
    http.put(`${API_URL}/admin/parametros`, async ({ request }) => {
      cuerpos.push(await request.clone().json());
    })
  );
  return cuerpos;
};

describe('Parámetros de la plataforma (HU-702)', () => {
  it('el admin los ve agrupados, con su unidad y su valor, desde el menú del backoffice', async () => {
    const { user, ubicacion } = await comoAdmin('/admin');

    const [enElMenu] = await screen.findAllByRole('link', { name: 'Parámetros' });
    await user.click(enElMenu);
    expect(ubicacion()).toBe('/admin/parametros');

    const gastos = (await screen.findByRole('heading', { name: 'Gastos administrativos' })).closest(
      'section'
    )!;
    expect(within(gastos).getByLabelText(/Gastos administrativos vigentes \(%\)/)).toHaveValue(10);
    expect(within(gastos).getByLabelText(/Tope de los gastos administrativos \(%\)/)).toHaveValue(
      20
    );
    expect(screen.getByLabelText(/Duración máxima de la ventana de check-in \(min\)/)).toHaveValue(
      60
    );
    expect(screen.getByLabelText(/Retiro máximo \(\$\)/)).toHaveValue(500000);
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  });

  it('guarda solo lo que cambió y muestra quién lo cambió', async () => {
    const cuerpos = espiarGuardado();
    const { user } = await comoAdmin('/admin/parametros');

    const checkin = await screen.findByLabelText(/Duración máxima de la ventana de check-in/);
    await user.clear(checkin);
    await user.type(checkin, '30');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Parámetros guardados');
    expect(cuerpos).toEqual([{ valores: { CHECKIN_DURACION_MAX_MIN: 30 } }]);
    expect(screen.getByText(/Último cambio: .*, por admin\./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  });

  it('un % por encima del tope no se guarda y el error va en su campo', async () => {
    const { user } = await comoAdmin('/admin/parametros');

    const gastos = await screen.findByLabelText(/Gastos administrativos vigentes/);
    await user.clear(gastos);
    await user.type(gastos, '25');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(
      await screen.findByText('No se guardó ningún cambio: revisá los campos marcados.')
    ).toBeInTheDocument();
    expect(gastos).toHaveAccessibleDescription('No puede superar el tope.');
  });

  it('una duración de 0 es error, y Descartar vuelve a los valores guardados', async () => {
    const { user } = await comoAdmin('/admin/parametros');

    const checkin = await screen.findByLabelText(/Duración máxima de la ventana de check-in/);
    await user.clear(checkin);
    await user.type(checkin, '0');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Tiene que ser mayor que 0.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Descartar' }));
    expect(checkin).toHaveValue(60);
  });

  it('sin el permiso no aparece en el menú', async () => {
    await renderRuta('/', { usuario: 'participante' });

    await screen.findAllByRole('link', { name: /Perfil/ });
    expect(screen.queryByRole('link', { name: 'Parámetros' })).not.toBeInTheDocument();
  });
});
