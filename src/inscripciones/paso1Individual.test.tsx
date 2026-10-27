import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { authApi } from '../api/authApi';
import { inscripcionApi } from '../api/inscripcionApi';
import { renderRuta } from '../test/renderRuta';

const REGLAMENTO = 'Acepto el Reglamento y Código de Conducta';
const TORNEO_INDIVIDUAL_PAGO = 2;

const idDeLaUbicacion = (ruta: string) => Number(/\/inscripciones\/(\d+)\//.exec(ruta)![1]);

describe('paso 1: torneo individual', () => {
  it('se reduce al reglamento: sin equipo ni nómina, y confirma el borrador que ya existe', async () => {
    await authApi.login('usuario', 'user123');
    const { id } = await inscripcionApi.crear(TORNEO_INDIVIDUAL_PAGO);
    const { user, ubicacion } = await renderRuta(`/inscripciones/${id}/nomina`);

    expect(await screen.findByText('Desafío Individual de Ping Pong')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Inscripción individual' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Equipo')).not.toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByText(/jugador/i)).not.toBeInTheDocument();
    const continuar = screen.getByRole('button', { name: /^Continuar al pago \(\$\s5\.000,00\)$/ });
    expect(continuar).toBeDisabled();

    await user.click(screen.getByLabelText(REGLAMENTO));
    await user.click(continuar);

    await waitFor(() => expect(ubicacion()).toBe(`/inscripciones/${id}/pago`));
    expect((await inscripcionApi.obtener(id)).estado).toBe('PENDIENTE_PAGO');
  });

  it('en el alta crea el borrador al continuar, sin cuerpo', async () => {
    const { user, ubicacion } = await renderRuta('/torneos/individual-pago/inscripcion');

    await user.click(await screen.findByLabelText(REGLAMENTO));
    await user.click(screen.getByRole('button', { name: /^Continuar al pago/ }));

    await waitFor(() => expect(ubicacion()).toMatch(/^\/inscripciones\/\d+\/pago$/));
    const inscripcion = await inscripcionApi.obtener(idDeLaUbicacion(ubicacion()));
    expect(inscripcion.estado).toBe('PENDIENTE_PAGO');
    expect(inscripcion.torneoId).toBe(TORNEO_INDIVIDUAL_PAGO);
  });

  it('si es gratis, confirmar deja la inscripción confirmada y no habla de pago', async () => {
    const { user, ubicacion } = await renderRuta('/torneos/individual-gratis/inscripcion');

    await user.click(await screen.findByLabelText(REGLAMENTO));
    expect(screen.queryByText(/pago/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmar inscripción' }));

    await waitFor(() => expect(ubicacion()).toMatch(/^\/inscripciones\/\d+\/pago$/));
    expect((await inscripcionApi.obtener(idDeLaUbicacion(ubicacion()))).estado).toBe('CONFIRMADA');
  });

  it('"Guardar como borrador y salir" deja el borrador creado y vuelve al inicio', async () => {
    const { user, ubicacion } = await renderRuta('/torneos/individual-pago/inscripcion');

    await user.click(await screen.findByRole('button', { name: 'Guardar como borrador y salir' }));

    await waitFor(() => expect(ubicacion()).toBe('/'));
    const [borrador] = (await inscripcionApi.listarMias({ torneoId: TORNEO_INDIVIDUAL_PAGO }))
      .content;
    expect(borrador.estado).toBe('BORRADOR');
  });
});
