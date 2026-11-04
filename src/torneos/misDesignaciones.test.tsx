import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { ArbitroDetalle, MiDesignacion } from '../api/torneoApi';
import { server } from '../mocks/server';
import { renderRuta } from '../test/renderRuta';
import { ArbitrosTorneo } from './components/ArbitrosTorneo';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const designacion: MiDesignacion = {
  torneoId: 9,
  torneo: 'Copa Primavera',
  slug: 'copa-primavera',
  estadoTorneo: 'INSCRIPCION_ABIERTA',
  fechaInicio: '2026-11-20T18:00:00Z',
  organizador: 'Olga Organizadora',
  estado: 'PENDIENTE',
  permisos: ['RESOLVER_OBJECIONES'],
  designadoEn: '2026-11-04T12:00:00Z',
};

/** Las designaciones del árbitro en el back, y lo que responde al aceptar o rechazar. */
const conDesignaciones = (lista: MiDesignacion[]) => {
  let actuales = lista;
  const responder =
    (estado: MiDesignacion['estado']) =>
    ({ params }: { params: Record<string, string | readonly string[]> }) => {
      actuales = actuales.map((d) =>
        d.torneoId === Number(params.torneoId) ? { ...d, estado } : d
      );
      return HttpResponse.json(actuales.find((d) => d.torneoId === Number(params.torneoId)));
    };
  server.use(
    http.get(`${API_URL}/designaciones/mias`, () => HttpResponse.json(actuales)),
    http.post(`${API_URL}/designaciones/:torneoId/aceptar`, responder('ACEPTADO')),
    http.post(`${API_URL}/designaciones/:torneoId/rechazar`, responder('RECHAZADO'))
  );
};

describe('Mis designaciones (HU-807)', () => {
  it('muestra el torneo y los permisos propuestos, y al aceptar habilita las objeciones', async () => {
    conDesignaciones([designacion]);
    const { user } = await renderRuta('/mis-designaciones');

    const tarjeta = (await screen.findByText('Copa Primavera')).closest('li')!;
    expect(within(tarjeta).getByText('Esperando tu respuesta')).toBeInTheDocument();
    expect(within(tarjeta).getByText(/Olga Organizadora/)).toBeInTheDocument();
    expect(within(tarjeta).getByText(/Resolver objeciones/)).toBeInTheDocument();

    await user.click(within(tarjeta).getByRole('button', { name: 'Aceptar' }));

    expect(await within(tarjeta).findByText('Aceptaste')).toBeInTheDocument();
    expect(within(tarjeta).getByRole('link', { name: 'Ver objeciones' })).toHaveAttribute(
      'href',
      '/torneos/9/objeciones'
    );
  });

  it('rechazar pide confirmación', async () => {
    conDesignaciones([designacion]);
    const { user } = await renderRuta('/mis-designaciones');

    await user.click(await screen.findByRole('button', { name: 'Rechazar' }));
    const dialogo = await screen.findByRole('dialog');
    await user.click(within(dialogo).getByRole('button', { name: 'Rechazar' }));

    expect(await screen.findByText('Rechazaste')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aceptar' })).not.toBeInTheDocument();
  });

  it('el menú muestra cuántas esperan respuesta, y no aparece sin designaciones', async () => {
    conDesignaciones([designacion, { ...designacion, torneoId: 10, estado: 'ACEPTADO' }]);
    const { unmount } = await renderRuta('/mi-perfil');

    const [item] = await screen.findAllByRole('link', { name: /Designaciones/ });
    expect(within(item).getByLabelText('1 sin responder')).toBeInTheDocument();
    unmount();

    conDesignaciones([]);
    await renderRuta('/mi-perfil');
    await screen.findAllByRole('link', { name: /Perfil/ });
    expect(screen.queryByRole('link', { name: /Designaciones/ })).not.toBeInTheDocument();
  });
});

describe('Paso 2: árbitros que rechazaron (HU-807)', () => {
  it('a uno que rechazó se lo puede volver a designar y queda pendiente', async () => {
    const rechazo: ArbitroDetalle = {
      usuarioId: 7,
      username: 'juez',
      nombres: 'Juan',
      apellidos: 'Pérez',
      estado: 'RECHAZADO',
      permisos: ['CARGAR_RESULTADOS'],
      designadoEn: '2026-11-04T12:00:00Z',
    };
    server.use(
      http.get(`${API_URL}/torneos/1/arbitros`, () => HttpResponse.json([rechazo])),
      http.get(`${API_URL}/arbitros`, () =>
        HttpResponse.json({
          content: [{ id: 7, username: 'juez', nombres: 'Juan', apellidos: 'Pérez' }],
          totalElements: 1,
          totalPages: 1,
          number: 0,
          size: 8,
        })
      ),
      http.post(`${API_URL}/torneos/1/arbitros`, () =>
        HttpResponse.json({ ...rechazo, estado: 'PENDIENTE' }, { status: 201 })
      )
    );
    render(<ArbitrosTorneo torneoId={1} habilitado />);

    expect(await screen.findByText('Rechazó')).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: 'Volver a designar' }));

    await waitFor(() => expect(screen.getByText('Pendiente de aceptación')).toBeInTheDocument());
    expect(screen.queryByText('Rechazó')).not.toBeInTheDocument();
    expect(screen.getAllByText('Juan Pérez')).toHaveLength(2);
  });
});
