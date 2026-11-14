import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, PathParams } from 'msw';
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
  disciplina: 'Fútbol 5',
  estadoTorneo: 'INSCRIPCION_ABIERTA',
  fechaInicio: '2026-11-20T18:00:00Z',
  fechaFin: '2026-11-22T18:00:00Z',
  organizador: 'Olga Organizadora',
  estado: 'PENDIENTE',
  permisos: ['RESOLVER_OBJECIONES'],
  designadoEn: '2026-11-04T12:00:00Z',
  respondidoEn: null,
  motivoRechazo: null,
  honorario: null,
};

/** Las designaciones del árbitro en el back; guarda lo que mandó al aceptar o rechazar. */
const conDesignaciones = (lista: MiDesignacion[]) => {
  let actuales = lista;
  const enviado: { aceptar?: unknown; rechazar?: unknown } = {};
  const responder =
    (accion: 'aceptar' | 'rechazar') =>
    async ({ params, request }: { params: PathParams; request: Request }) => {
      const cuerpo = (await request.json()) as { motivo?: string | null };
      enviado[accion] = cuerpo;
      const estado = accion === 'aceptar' ? 'ACEPTADO' : 'RECHAZADO';
      actuales = actuales.map((d) =>
        d.torneoId === Number(params.torneoId)
          ? {
              ...d,
              estado,
              respondidoEn: '2026-11-04T13:00:00Z',
              motivoRechazo: cuerpo.motivo ?? null,
            }
          : d
      );
      return HttpResponse.json(actuales.find((d) => d.torneoId === Number(params.torneoId)));
    };
  server.use(
    http.get(`${API_URL}/designaciones/mias`, () => HttpResponse.json(actuales)),
    http.post(`${API_URL}/designaciones/:torneoId/aceptar`, responder('aceptar')),
    http.post(`${API_URL}/designaciones/:torneoId/rechazar`, responder('rechazar'))
  );
  return enviado;
};

describe('Mis designaciones (HU-807)', () => {
  it('la lista lleva a la designación pendiente para responderla', async () => {
    conDesignaciones([designacion]);
    const { user, ubicacion } = await renderRuta('/mis-designaciones');

    const tarjeta = (await screen.findByText('Copa Primavera')).closest('li')!;
    expect(within(tarjeta).getByText('Pendiente')).toBeInTheDocument();
    expect(within(tarjeta).getByText(/Fútbol 5 · Organiza Olga Organizadora/)).toBeInTheDocument();

    await user.click(within(tarjeta).getByRole('link', { name: 'Responder' }));
    expect(ubicacion()).toBe('/mis-designaciones/9');
  });

  it('aceptar pide el código de imparcialidad completo y después habilita las objeciones', async () => {
    const enviado = conDesignaciones([designacion]);
    const { user } = await renderRuta('/mis-designaciones/9');

    expect(
      await screen.findByRole('heading', { name: 'Aceptar designación como árbitro' })
    ).toBeInTheDocument();
    expect(screen.getByText('Fútbol 5')).toBeInTheDocument();
    expect(screen.getByText('Resolver objeciones')).toBeInTheDocument();

    const aceptar = screen.getByRole('button', { name: 'Aceptar y confirmar' });
    const casillas = screen.getAllByRole('checkbox');
    expect(casillas).toHaveLength(3);
    await user.click(casillas[0]);
    await user.click(casillas[1]);
    expect(aceptar).toBeDisabled();
    await user.click(casillas[2]);
    expect(aceptar).toBeEnabled();

    await user.click(aceptar);

    expect(await screen.findByText('Estado: Aceptada')).toBeInTheDocument();
    expect(enviado.aceptar).toEqual({ compromisoAceptado: true });
    expect(screen.getByRole('link', { name: 'Ver objeciones' })).toHaveAttribute(
      'href',
      '/torneos/9/objeciones'
    );
  });

  it('rechazar pide confirmación y manda el motivo', async () => {
    const enviado = conDesignaciones([designacion]);
    const { user } = await renderRuta('/mis-designaciones/9');

    await user.click(await screen.findByRole('button', { name: 'Rechazar designación' }));
    const dialogo = await screen.findByRole('dialog');
    await user.type(within(dialogo).getByLabelText(/Motivo/), 'Viajo ese fin de semana');
    await user.click(within(dialogo).getByRole('button', { name: 'Rechazar' }));

    expect(await screen.findByText('Estado: Rechazada')).toBeInTheDocument();
    expect(enviado.rechazar).toEqual({ motivo: 'Viajo ese fin de semana' });
    expect(screen.getByText('Motivo: Viajo ese fin de semana')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aceptar y confirmar' })).not.toBeInTheDocument();
  });

  it('una designación que no es tuya avisa', async () => {
    conDesignaciones([designacion]);
    await renderRuta('/mis-designaciones/99');

    expect(await screen.findByRole('alert')).toHaveTextContent('No figurás como árbitro');
  });

  it('el menú y la campana muestran cuántas esperan respuesta, y no aparecen sin designaciones', async () => {
    conDesignaciones([designacion, { ...designacion, torneoId: 10, estado: 'ACEPTADO' }]);
    const { unmount } = await renderRuta('/mi-perfil');

    const [item] = await screen.findAllByRole('link', { name: /^Designaciones/ });
    expect(within(item).getByLabelText('1 sin responder')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Designaciones: 1 sin responder' })
    ).toBeInTheDocument();
    unmount();

    conDesignaciones([]);
    await renderRuta('/mi-perfil');
    await screen.findAllByRole('link', { name: /Perfil/ });
    expect(screen.queryByRole('link', { name: /Designaciones/ })).not.toBeInTheDocument();
  });
});

describe('Paso 2: árbitros que rechazaron (HU-807)', () => {
  it('muestra el motivo y se lo puede volver a designar', async () => {
    const rechazo: ArbitroDetalle = {
      usuarioId: 7,
      username: 'juez',
      nombres: 'Juan',
      apellidos: 'Pérez',
      estado: 'RECHAZADO',
      permisos: ['CARGAR_RESULTADOS'],
      designadoEn: '2026-11-04T12:00:00Z',
      respondidoEn: '2026-11-04T13:00:00Z',
      motivoRechazo: 'Viajo ese fin de semana',
      identidadVerificada: true,
    };
    server.use(
      http.get(`${API_URL}/torneos/1/arbitros`, () => HttpResponse.json([rechazo])),
      http.get(`${API_URL}/arbitros`, () =>
        HttpResponse.json({
          content: [
            {
              id: 7,
              username: 'juez',
              nombres: 'Juan',
              apellidos: 'Pérez',
              identidadVerificada: true,
            },
          ],
          totalElements: 1,
          totalPages: 1,
          number: 0,
          size: 8,
        })
      ),
      http.post(`${API_URL}/torneos/1/arbitros`, () =>
        HttpResponse.json(
          { ...rechazo, estado: 'PENDIENTE', respondidoEn: null, motivoRechazo: null },
          { status: 201 }
        )
      )
    );
    render(<ArbitrosTorneo torneoId={1} habilitado conDinero={false} />);

    expect(await screen.findByText('Rechazó')).toBeInTheDocument();
    expect(screen.getByText('Motivo: Viajo ese fin de semana')).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: 'Volver a designar' }));

    await waitFor(() => expect(screen.getByText('Pendiente de aceptación')).toBeInTheDocument());
    expect(screen.queryByText('Rechazó')).not.toBeInTheDocument();
    expect(screen.queryByText(/Motivo:/)).not.toBeInTheDocument();
  });
});
