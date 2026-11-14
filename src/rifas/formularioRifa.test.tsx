import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { server } from '../mocks/server';
import { DatosRifaForm, validateDatosRifa } from '../shared/validators';
import { RifaFormPage } from './pages/RifaFormPage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const enDias = (dias: number) => {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
};

const isoEnDias = (dias: number) => `${enDias(dias)}T12:00:00`;

const SIN_FECHAS = { publicadoEn: null, fechaInicio: null, fechaFin: null };

/** El torneo 100 con esas fechas; `alGuardar` responde el POST /rifas. */
const conTorneo = (
  fechas: object,
  alGuardar: (info: { request: Request }) => Response | Promise<Response>
) => {
  const guardar = vi.fn(alGuardar);
  const pedirTorneo = vi.fn(() => HttpResponse.json({ id: 100, ...fechas }));
  server.use(
    http.get(`${API_URL}/torneos/mis-torneos`, () =>
      HttpResponse.json({
        content: [{ id: 100, nombre: 'Copa Primavera', estado: 'INSCRIPCION_ABIERTA' }],
      })
    ),
    http.get(`${API_URL}/torneos/100`, pedirTorneo),
    http.post(`${API_URL}/rifas`, guardar)
  );
  return { guardar, pedirTorneo };
};

const completarYGuardar = async (
  pedirTorneo: ReturnType<typeof vi.fn>,
  /** null: elige iniciar la venta al publicar. */
  ventaDesde: string | null,
  ventaHasta: string
) => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={['/rifas/nueva?torneo=100']}>
      <Routes>
        <Route path="/rifas/nueva" element={<RifaFormPage />} />
      </Routes>
    </MemoryRouter>
  );
  // Las fechas del torneo tienen que haber llegado antes de guardar
  await vi.waitFor(() => expect(pedirTorneo).toHaveBeenCalled());
  await act(() => new Promise((resolve) => setTimeout(resolve, 50)));

  await user.type(screen.getByLabelText(/Título de la rifa/), 'Gran Rifa');
  await user.type(screen.getByLabelText(/Número desde/), '1');
  await user.type(screen.getByLabelText(/Número hasta/), '100');
  await user.type(screen.getByLabelText(/Precio por número/), '500');
  if (ventaDesde === null) {
    await user.click(screen.getByRole('button', { name: 'Iniciar la venta al publicar' }));
  } else {
    fireEvent.change(screen.getByLabelText('Fecha de inicio de la venta'), {
      target: { value: ventaDesde },
    });
  }
  fireEvent.change(screen.getByLabelText('Fin de la venta'), { target: { value: ventaHasta } });
  await user.click(screen.getByRole('button', { name: 'Guardar como borrador' }));
};

/** El aviso general está justo arriba de la fila del botón Guardar. */
const expectJuntoAlBoton = (texto: string) => {
  const aviso = screen
    .getAllByRole('alert')
    .find((a) => a.classList.contains('alerta') && a.textContent === texto);
  expect(aviso?.nextElementSibling).toHaveClass('rifas-pie');
};

describe('PICA-308: Errores del formulario de rifa', () => {
  it('Con el fin de la venta después del inicio del torneo, avisa sin mandar el formulario', async () => {
    const { guardar, pedirTorneo } = conTorneo(
      { publicadoEn: isoEnDias(-1), fechaInicio: isoEnDias(10), fechaFin: null },
      () => HttpResponse.json({})
    );
    await completarYGuardar(pedirTorneo, enDias(1), enDias(20));

    expect(
      await screen.findByText('La fecha debe ser anterior al inicio del torneo.')
    ).toBeVisible();
    expect(screen.getByLabelText('Fin de la venta')).toHaveAttribute('aria-invalid', 'true');
    expectJuntoAlBoton('Revisá los campos marcados.');
    expect(guardar).not.toHaveBeenCalled();
  });

  it('Si el torneo tiene fecha de fin, la venta puede durar hasta ahí y no más', async () => {
    const { guardar, pedirTorneo } = conTorneo(
      { publicadoEn: isoEnDias(-1), fechaInicio: isoEnDias(10), fechaFin: isoEnDias(15) },
      () => HttpResponse.json({})
    );
    await completarYGuardar(pedirTorneo, enDias(1), enDias(20));

    expect(
      await screen.findByText('La fecha debe ser anterior a la finalización del torneo.')
    ).toBeVisible();
    expect(guardar).not.toHaveBeenCalled();
  });

  it('Con el inicio de la venta antes de hoy, avisa sin mandar el formulario', async () => {
    const { guardar, pedirTorneo } = conTorneo(SIN_FECHAS, () => HttpResponse.json({}));
    await completarYGuardar(pedirTorneo, enDias(-1), enDias(5));

    expect(await screen.findByText('No puede ser anterior a hoy.')).toBeVisible();
    expect(screen.getByLabelText('Fecha de inicio de la venta')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
    expect(guardar).not.toHaveBeenCalled();
  });

  it('Con el inicio de la venta antes de que se publique el torneo, avisa sin mandar el formulario', async () => {
    const { guardar, pedirTorneo } = conTorneo(
      { publicadoEn: isoEnDias(3), fechaInicio: isoEnDias(10), fechaFin: null },
      () => HttpResponse.json({})
    );
    await completarYGuardar(pedirTorneo, enDias(1), enDias(5));

    expect(
      await screen.findByText('No puede empezar antes de que se publique el torneo.')
    ).toBeVisible();
    expect(guardar).not.toHaveBeenCalled();
  });

  it('Con un año de más de 4 cifras, avisa sin mandar el formulario', async () => {
    const { guardar, pedirTorneo } = conTorneo(SIN_FECHAS, () => HttpResponse.json({}));
    await completarYGuardar(pedirTorneo, null, '20226-11-13');

    expect(await screen.findByText('Fecha inválida.')).toBeVisible();
    expect(screen.getByLabelText('Fin de la venta')).toHaveAttribute('aria-invalid', 'true');
    expectJuntoAlBoton('Revisá los campos marcados.');
    expect(guardar).not.toHaveBeenCalled();
  });

  it('Un error del back sobre un campo se ve en el campo y junto al botón', async () => {
    const { guardar, pedirTorneo } = conTorneo(SIN_FECHAS, () =>
      HttpResponse.json(
        {
          status: 400,
          codigo: 'VALIDACION',
          detail: 'Hay campos inválidos',
          errores: [
            {
              campo: 'ventaHasta',
              codigo: 'VENTANA_INVALIDA',
              mensaje: 'La fecha debe ser anterior a la finalización del torneo',
            },
          ],
        },
        { status: 400 }
      )
    );
    await completarYGuardar(pedirTorneo, enDias(1), enDias(5));

    expect(
      await screen.findByText('La fecha debe ser anterior a la finalización del torneo.')
    ).toBeVisible();
    expect(screen.getByLabelText('Fin de la venta')).toHaveAttribute('aria-invalid', 'true');
    expectJuntoAlBoton('Revisá los campos marcados.');
    expect(guardar).toHaveBeenCalledOnce();
  });

  it('Un error del back sin campo sobre el torneo se ve en el selector y junto al botón', async () => {
    const { pedirTorneo } = conTorneo(SIN_FECHAS, () =>
      HttpResponse.json(
        { status: 409, codigo: 'TORNEO_NO_ADMITE_RIFA', detail: 'El torneo 100 está EN_CURSO' },
        { status: 409 }
      )
    );
    await completarYGuardar(pedirTorneo, enDias(1), enDias(5));

    const mensaje = 'Ese torneo ya empezó o terminó: no se le puede asociar una rifa.';
    expect(await screen.findAllByText(mensaje)).toHaveLength(2);
    expect(screen.getByLabelText(/Torneo/)).toHaveAttribute('aria-invalid', 'true');
    expectJuntoAlBoton(mensaje);
  });

  it('Un error del back sin campo ni torneo igual se ve junto al botón', async () => {
    const { pedirTorneo } = conTorneo(SIN_FECHAS, () =>
      HttpResponse.json({ status: 500, codigo: 'ERROR_INTERNO', detail: 'Falló' }, { status: 500 })
    );
    await completarYGuardar(pedirTorneo, enDias(1), enDias(5));

    await screen.findByText('Algo falló en el servidor. Probá de nuevo en un rato.');
    expectJuntoAlBoton('Algo falló en el servidor. Probá de nuevo en un rato.');
  });
});

describe('PICA-308: Iniciar la venta al publicar', () => {
  it('Deshabilita la fecha de inicio y la manda vacía', async () => {
    let cuerpo: { ventaDesde?: unknown; ventaHasta?: unknown } = {};
    const { pedirTorneo } = conTorneo(SIN_FECHAS, async ({ request }) => {
      cuerpo = (await request.json()) as typeof cuerpo;
      return HttpResponse.json({ status: 500, codigo: 'ERROR_INTERNO' }, { status: 500 });
    });
    await completarYGuardar(pedirTorneo, null, enDias(5));

    expect(screen.getByLabelText('Fecha de inicio de la venta')).toBeDisabled();
    await vi.waitFor(() => expect(cuerpo.ventaHasta).toBeTruthy());
    expect(cuerpo.ventaDesde).toBeNull();
  });

  it('Sigue controlando el fin de la venta contra el torneo', async () => {
    const { guardar, pedirTorneo } = conTorneo(
      { publicadoEn: isoEnDias(-1), fechaInicio: isoEnDias(10), fechaFin: null },
      () => HttpResponse.json({})
    );
    await completarYGuardar(pedirTorneo, null, enDias(20));

    expect(
      await screen.findByText('La fecha debe ser anterior al inicio del torneo.')
    ).toBeVisible();
    expect(guardar).not.toHaveBeenCalled();
  });
});

describe('PICA-308: Validación de la ventana de venta', () => {
  const datos: DatosRifaForm = {
    titulo: 'Gran Rifa',
    numeroDesde: '1',
    numeroHasta: '100',
    precioNumero: '500',
    inicioVenta: 'FECHA',
    ventaDesde: `${enDias(-5)}T00:00`,
    ventaHasta: `${enDias(5)}T00:00`,
    fechaSorteo: '',
    torneoId: '',
    pctDestinadoTorneo: '0',
  };

  it('Un borrador que ya tenía guardado un inicio pasado se puede seguir editando sin cambiarlo', () => {
    expect(validateDatosRifa(datos, 0, 0, null, datos.ventaDesde).ventaDesde).toBeUndefined();
  });

  it('Si se cambia el inicio por otra fecha pasada, avisa', () => {
    expect(validateDatosRifa(datos, 0, 0, null, `${enDias(-9)}T00:00`).ventaDesde).toBe(
      'No puede ser anterior a hoy.'
    );
  });

  it('Al publicar no pide inicio, pero sí el fin de la venta', () => {
    const alPublicar: DatosRifaForm = { ...datos, inicioVenta: 'AL_PUBLICAR', ventaDesde: '' };
    expect(validateDatosRifa(alPublicar)).toEqual({});
    expect(validateDatosRifa({ ...alPublicar, ventaHasta: '' }).ventaHasta).toBe(
      'Completá el fin de la venta.'
    );
  });

  it('Hoy a cualquier hora es un inicio válido', () => {
    const deHoy = { ...datos, ventaDesde: `${enDias(0)}T00:00` };
    expect(validateDatosRifa(deHoy).ventaDesde).toBeUndefined();
  });
});
