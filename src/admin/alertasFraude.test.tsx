import { screen, waitFor, within } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { authApi } from '../api/authApi';
import { server } from '../mocks/server';
import { renderRuta } from '../test/renderRuta';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const comoUsuario = (identificador: string, password: string, ruta: string) =>
  renderRuta(ruta, {
    usuario: 'anonimo',
    prepara: async () => {
      await authApi.login(identificador, password);
    },
  });

const espiarConsultas = () => {
  const consultas: URLSearchParams[] = [];
  server.use(
    http.get(`${API_URL}/admin/alertas-fraude`, ({ request }) => {
      consultas.push(new URL(request.url).searchParams);
    })
  );
  return consultas;
};

const filas = async () => {
  const tabla = await screen.findByRole('table', { name: 'Listado de alertas de fraude' });
  return within(tabla).getAllByRole('row').slice(1);
};

describe('HU-705 / T705-2 (PICA-417): Panel de alertas de fraude en el admin', () => {
  it('soporte ve Alertas con el contador de pendientes en el menú y accede a la tabla con enlaces', async () => {
    const { user, ubicacion } = await comoUsuario('soporte', 'soporte123', '/admin');

    const [linkMenu] = await screen.findAllByRole('link', { name: /^Alertas/ });
    expect(await within(linkMenu).findByLabelText('3 pendientes')).toBeInTheDocument();

    await user.click(linkMenu);
    expect(ubicacion()).toBe('/admin/alertas');

    const rows = await filas();
    expect(rows).toHaveLength(4);
    expect(rows[0]).toHaveTextContent('Compra masiva en rifa');
    expect(rows[0]).toHaveTextContent('Pendiente');
    expect(rows[0]).toHaveTextContent('@jperez');
    expect(rows[0]).toHaveTextContent(/14 números comprados/);
    expect(rows[3]).toHaveTextContent('Cancelaciones reiteradas');
    expect(rows[3]).toHaveTextContent('Revisada');

    expect(
      within(rows[0]).getByRole('link', { name: 'Gran Rifa Benéfica de la Copa' })
    ).toHaveAttribute('href', '/rifas/10');
    expect(
      within(rows[0]).getByRole('link', { name: 'Liga Abierta de Ajedrez Rápido' })
    ).toHaveAttribute('href', '/torneos/liga-ajedrez-primavera');
  });

  it('sin ALERTA_FRAUDE_REVISAR no ve Alertas en el menú y redirige a /unauthorized', async () => {
    const sinPermiso = await renderRuta('/admin/alertas', { usuario: 'organizador' });
    await waitFor(() => expect(sinPermiso.ubicacion()).toBe('/unauthorized'));
    expect(await screen.findByRole('heading', { name: 'Acceso Denegado' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Alertas/ })).not.toBeInTheDocument();
  });

  it('combina filtros de estado, regla, usuario, torneo, rifa y fechas, y limpiar los restablece', async () => {
    const consultas = espiarConsultas();
    const { user } = await comoUsuario('admin', 'admin123', '/admin/alertas');
    await filas();

    await user.selectOptions(screen.getByLabelText('Estado'), 'PENDIENTE');
    await user.selectOptions(screen.getByLabelText('Regla'), 'OBJECIONES_ABUSIVAS');
    await user.type(screen.getByRole('searchbox', { name: 'Usuario' }), 'jperez');
    await user.click(await screen.findByRole('button', { name: /@jperez/ }));
    await user.type(screen.getByLabelText('Torneo (ID)'), '1');

    const rows = await filas();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('Copa abierta');

    const ultima = consultas[consultas.length - 1];
    expect(ultima.get('estado')).toBe('PENDIENTE');
    expect(ultima.get('regla')).toBe('OBJECIONES_ABUSIVAS');
    expect(ultima.get('usuarioId')).toBe('2');
    expect(ultima.get('torneoId')).toBe('1');

    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(await filas()).toHaveLength(4);

    await user.type(screen.getByLabelText('Rifa (ID)'), '10');
    await user.type(screen.getByLabelText('Desde'), '2026-11-12');
    await user.type(screen.getByLabelText('Hasta'), '2026-11-12');
    await screen.findByText('Mostrando 1 a 1 de 1 alertas');
  });

  it('exige nota obligatoria al marcar como revisada, saca la alerta de pendientes y actualiza el contador', async () => {
    const { user } = await comoUsuario('soporte', 'soporte123', '/admin/alertas');
    await filas();

    await user.click(screen.getByRole('button', { name: 'Ver detalle de la alerta 1' }));

    const modal = await screen.findByRole('dialog', {
      name: /Alerta #1 · Compra masiva en rifa/,
    });
    expect(within(modal).getByText('Números comprados')).toBeInTheDocument();
    expect(within(modal).getByText('14')).toBeInTheDocument();

    // Nota vacía: bloquea el envío
    await user.click(within(modal).getByRole('button', { name: 'Marcar como revisada' }));
    expect(
      await within(modal).findByText('Ingresá una nota explicando la revisión.')
    ).toBeInTheDocument();

    // Nota válida: pasa a REVISADA y baja el contador del menú de 3 a 2
    await user.type(
      within(modal).getByLabelText(/Nota de revisión/),
      'Se corroboraron compras legítimas del grupo.'
    );
    await user.click(within(modal).getByRole('button', { name: 'Marcar como revisada' }));

    expect(await within(modal).findByText('Alerta marcada como revisada.')).toBeInTheDocument();
    expect(within(modal).getByText('@soporte')).toBeInTheDocument();
    expect(
      within(modal).getByText('Se corroboraron compras legítimas del grupo.')
    ).toBeInTheDocument();

    await waitFor(() => {
      const [linkMenu] = screen.getAllByRole('link', { name: /^Alertas/ });
      expect(within(linkMenu).getByLabelText('2 pendientes')).toBeInTheDocument();
    });

    await user.click(within(modal).getByRole('button', { name: 'Cerrar' }));
    await user.selectOptions(screen.getByLabelText('Estado'), 'PENDIENTE');
    const pendientes = await filas();
    expect(pendientes).toHaveLength(2);
    expect(
      screen.queryByRole('button', { name: 'Ver detalle de la alerta 1' })
    ).not.toBeInTheDocument();
  });

  it('desde el detalle permite bloquear al usuario involucrado y abrir su auditoría filtrada', async () => {
    const { user, ubicacion } = await comoUsuario('admin', 'admin123', '/admin/alertas');
    await filas();

    await user.click(screen.getByRole('button', { name: 'Ver detalle de la alerta 1' }));
    const modal = await screen.findByRole('dialog', {
      name: /Alerta #1 · Compra masiva en rifa/,
    });

    // 1. Acceso directo a bloquear usuario (HU-703)
    await user.click(within(modal).getByRole('button', { name: 'Bloquear usuario' }));
    const modalBloqueo = await screen.findByRole('dialog', { name: /Bloquear a/i });
    await user.type(within(modalBloqueo).getByLabelText(/Motivo/), 'Compra masiva automatizada.');
    await user.click(within(modalBloqueo).getByRole('button', { name: 'Continuar' }));
    await user.type(within(modalBloqueo).getByPlaceholderText('BLOQUEAR'), 'BLOQUEAR');
    await user.click(within(modalBloqueo).getByRole('button', { name: 'Aplicar bloqueo' }));

    const modalReabierto = await screen.findByRole('dialog', {
      name: /Alerta #1 · Compra masiva en rifa/,
    });
    expect(
      within(modalReabierto).getByRole('button', { name: 'Usuario bloqueado' })
    ).toBeDisabled();

    // 2. Acceso directo a ver auditoría del usuario (HU-704)
    const linkAuditoria = within(modalReabierto).getByRole('link', { name: 'Ver auditoría' });
    expect(linkAuditoria).toHaveAttribute('href', '/admin/auditoria?usuario=2&username=jperez');
    await user.click(linkAuditoria);

    expect(ubicacion()).toBe('/admin/auditoria?usuario=2&username=jperez');
    expect(await screen.findByRole('heading', { name: 'Auditoría' })).toBeInTheDocument();
    expect(await screen.findByText('Mostrando 1 a 2 de 2 registros')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quitar usuario' })).toBeInTheDocument();
  });
});
