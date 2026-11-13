import { screen, waitFor, within } from '@testing-library/react';
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

/** Guarda los query params de cada GET /admin/auditoria y lo deja pasar al mock. */
const espiarConsultas = () => {
  const consultas: URLSearchParams[] = [];
  server.use(
    http.get(`${API_URL}/admin/auditoria`, ({ request }) => {
      consultas.push(new URL(request.url).searchParams);
    })
  );
  return consultas;
};

/** Las filas de la tabla, sin el encabezado. */
const filas = async () => {
  const tabla = await screen.findByRole('table', { name: /Registros de la auditoría/ });
  return within(tabla).getAllByRole('row').slice(1);
};

describe('Libro de auditoría (HU-704)', () => {
  it('el admin llega desde el menú y ve todos los registros, del más nuevo al más viejo', async () => {
    const { user, ubicacion } = await comoAdmin('/admin');

    const [enElMenu] = await screen.findAllByRole('link', { name: 'Auditoría' });
    await user.click(enElMenu);
    expect(ubicacion()).toBe('/admin/auditoria');

    const registros = await filas();
    expect(registros).toHaveLength(9);
    expect(registros[1]).toHaveTextContent('@jperez');
    expect(registros[1]).toHaveTextContent('Pago');
    expect(registros[1]).toHaveTextContent('Billetera 2');
    expect(registros[2]).toHaveTextContent('Sistema');
    expect(registros[2]).toHaveTextContent('Liquidación');
    expect(registros[8]).toHaveTextContent('Inicio de sesión');
    expect(registros[8]).toHaveTextContent('190.24.55.12');
    expect(screen.getByText('Mostrando 1 a 9 de 9 registros')).toBeInTheDocument();
  });

  it('un login con un usuario que no existe muestra lo que se escribió en lugar de «Sistema»', async () => {
    await comoAdmin('/admin/auditoria');

    const [fallido] = await filas();
    expect(fallido).toHaveTextContent('jperes (no existe)');
    expect(fallido).toHaveTextContent('Inicio de sesión fallido');
    expect(fallido).not.toHaveTextContent('Sistema');
  });

  it('los filtros de acción y usuario se combinan y la tabla se actualiza', async () => {
    const consultas = espiarConsultas();
    const { user } = await comoAdmin('/admin/auditoria');
    await filas();

    await user.selectOptions(screen.getByLabelText('Acción'), 'LAUDO');
    await user.type(screen.getByRole('searchbox', { name: 'Usuario' }), 'lfern');
    await user.click(await screen.findByRole('button', { name: /@lfernandez/ }));

    await screen.findByRole('button', { name: 'Quitar usuario' });
    const registros = await filas();
    expect(registros).toHaveLength(1);
    expect(registros[0]).toHaveTextContent('Laudo');
    expect(registros[0]).toHaveTextContent('Partido 15');
    const ultima = consultas[consultas.length - 1];
    expect(ultima.get('accion')).toBe('LAUDO');
    expect(ultima.get('usuario')).toBe('4');
    expect(ultima.get('page')).toBe('0');
  });

  it('con la entidad Torneo y su id trae lo del torneo y lo suyo', async () => {
    const consultas = espiarConsultas();
    const { user } = await comoAdmin('/admin/auditoria');
    await filas();

    expect(screen.getByLabelText('Id')).toBeDisabled();
    await user.selectOptions(screen.getByLabelText('Entidad'), 'TORNEO');
    await within(screen.getByLabelText('Id')).findByRole('option', { name: '3' });
    await user.selectOptions(screen.getByLabelText('Id'), '3');

    await screen.findByText('Mostrando 1 a 4 de 4 registros');
    const registros = await filas();
    expect(registros.map((r) => within(r).getAllByRole('cell')[3].textContent)).toEqual([
      'Torneo 3',
      'Partido 15',
      'Torneo 3',
      'Custodia 7',
    ]);
    const ultima = consultas[consultas.length - 1];
    expect(ultima.get('entidad')).toBe('TORNEO');
    expect(ultima.get('entidadId')).toBe('3');
  });

  it('con otra entidad busca la exacta, y sin id trae todas las de ese tipo', async () => {
    const { user } = await comoAdmin('/admin/auditoria');
    await filas();

    await user.selectOptions(screen.getByLabelText('Entidad'), 'USUARIO');
    await screen.findByText('Mostrando 1 a 3 de 3 registros');

    await within(screen.getByLabelText('Id')).findByRole('option', { name: '4' });
    await user.selectOptions(screen.getByLabelText('Id'), '4');
    await screen.findByText('Mostrando 1 a 1 de 1 registros');
    expect((await filas())[0]).toHaveTextContent('Inicio de sesión fallido');
  });

  it('cada fila dice de qué torneo, rifa o usuario se trata', async () => {
    await comoAdmin('/admin/auditoria');

    const descripciones = (await filas()).map((r) => within(r).getAllByRole('cell')[4].textContent);
    expect(descripciones).toContain('Liga Abierta de Ajedrez Rápido');
    expect(descripciones).toContain('Ronda 1 – Liga Abierta de Ajedrez Rápido');
    expect(descripciones).toContain('@jperez');
  });

  it('al elegir la entidad, la lista de ids ofrece los que tienen registros', async () => {
    const { user } = await comoAdmin('/admin/auditoria');
    await filas();

    const ids = screen.getByLabelText('Id');
    expect(ids).toBeDisabled();
    await user.selectOptions(screen.getByLabelText('Entidad'), 'USUARIO');

    await waitFor(() =>
      expect(within(ids).getAllByRole('option').map((o) => o.textContent)).toEqual(['Todos', '4', '1'])
    );
    expect(ids).toBeEnabled();
  });

  it('tocar la entidad de una fila filtra por ella', async () => {
    const { user } = await comoAdmin('/admin/auditoria');
    await filas();

    await user.click(screen.getByRole('button', { name: 'Partido 15' }));

    await screen.findByText('Mostrando 1 a 1 de 1 registros');
    expect(screen.getByLabelText('Entidad')).toHaveValue('PARTIDO');
    expect(screen.getByLabelText('Id')).toHaveValue('15');
    expect((await filas())[0]).toHaveTextContent('Laudo');
  });

  it('con un rango de fechas solo trae lo de esos días, y el último día entra entero', async () => {
    const consultas = espiarConsultas();
    const { user } = await comoAdmin('/admin/auditoria');
    await filas();

    await user.type(screen.getByLabelText('Desde'), '2026-11-05');
    await user.type(screen.getByLabelText('Hasta'), '2026-11-05');

    await screen.findByText('Mostrando 1 a 2 de 2 registros');
    const registros = await filas();
    expect(registros[0]).toHaveTextContent('Inicio de sesión fallido');
    expect(registros[1]).toHaveTextContent('Laudo');
    const ultima = consultas[consultas.length - 1];
    expect(ultima.get('desde')).toBe(new Date('2026-11-05T00:00').toISOString());
    expect(ultima.get('hasta')).toBe(new Date('2026-11-06T00:00').toISOString());
  });

  it('con un filtro sin resultados muestra la lista vacía con un mensaje, y limpiar vuelve a todo', async () => {
    const { user } = await comoAdmin('/admin/auditoria');
    await filas();

    await user.selectOptions(screen.getByLabelText('Acción'), 'REINTEGRO');

    expect(await screen.findByText('No hay registros que cumplan con los filtros.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(await filas()).toHaveLength(9);
  });

  it('el detalle de un registro se ve completo', async () => {
    const { user } = await comoAdmin('/admin/auditoria');
    await filas();

    await user.click(screen.getByRole('button', { name: 'Ver detalle del registro 5' }));

    const ficha = await screen.findByRole('dialog', { name: 'Registro 5' });
    expect(ficha).toHaveTextContent('@lfernandez');
    expect(ficha).toHaveTextContent('Partido 15');
    expect(ficha).toHaveTextContent('Ronda 1 – Liga Abierta de Ajedrez Rápido');
    expect(ficha).toHaveTextContent('"resultado": "3-1"');
    expect(ficha).toHaveTextContent(
      'El visitante no se presentó al segundo tiempo y el árbitro dio por terminado el partido.'
    );
  });

  it('sin AUDITORIA_VER no aparece en el menú ni se ve la pantalla', async () => {
    await renderRuta('/admin', { usuario: 'soporte' });
    await screen.findAllByRole('link', { name: 'Cancelaciones' });
    expect(screen.queryByRole('link', { name: 'Auditoría' })).not.toBeInTheDocument();
  });

  it('entrando directo sin el permiso no se ve la auditoría', async () => {
    await renderRuta('/admin/auditoria', { usuario: 'soporte' });

    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('heading', { name: 'Auditoría' })).not.toBeInTheDocument();
  });
});
