import { describe, expect, it } from 'vitest';
import { delay, http } from 'msw';
import { screen, waitFor, within } from '@testing-library/react';
import { authApi } from '../api/authApi';
import { equipoApi } from '../api/equipoApi';
import { inscripcionApi } from '../api/inscripcionApi';
import { problema } from '../mocks/adminHandlers';
import { server } from '../mocks/server';
import { renderRuta } from '../test/renderRuta';

const TORNEO_F5 = 1;
const TORNEO_GRATIS = 3;
const JUGADOR_LUCAS = 101;
const JUGADOR_MATIAS = 102;

// Arma el estado de partida con la API como el participante; renderRuta vuelve a entrar con él
// y así se conoce el id del borrador antes de abrir su ruta.
const comoParticipante = async <T,>(accion: () => Promise<T>) => {
  await authApi.login('usuario', 'user123');
  return accion();
};

describe('paso 1: retomar un borrador', () => {
  it('muestra el equipo, la nómina y el reglamento sin aceptar, y guarda sobre el mismo borrador', async () => {
    const { id } = await comoParticipante(() =>
      inscripcionApi.crear(TORNEO_F5, {
        nombreEquipoNuevo: 'Los Retomados',
        nomina: [JUGADOR_LUCAS, JUGADOR_MATIAS],
      })
    );
    const { user, ubicacion } = await renderRuta(`/inscripciones/${id}/nomina`);

    expect(await screen.findByText('Torneo Apertura F5')).toBeInTheDocument();
    expect(await screen.findByLabelText('Equipo')).toHaveDisplayValue('Los Retomados');
    const nomina = screen.getByRole('list', { name: 'Nómina' });
    expect(within(nomina).getByText(/Usuario PICA \(Capitán\)/)).toBeInTheDocument();
    expect(within(nomina).getByText('Lucas Fernández')).toBeInTheDocument();
    expect(within(nomina).getByText('Matías Rossi')).toBeInTheDocument();
    expect(screen.getByText('3 jugadores (mínimo 5)')).toBeInTheDocument();
    expect(screen.getByLabelText('Acepto el Reglamento y Código de Conducta')).not.toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Sacar a Lucas Fernández' }));
    await user.click(screen.getByRole('button', { name: 'Guardar como borrador y salir' }));

    await waitFor(() => expect(ubicacion()).toBe('/'));
    const mias = (await inscripcionApi.listarMias({ torneoId: TORNEO_F5 })).content;
    expect(mias.filter((i) => i.estado === 'BORRADOR')).toHaveLength(1);
    expect((await inscripcionApi.obtener(id)).nomina).toHaveLength(2);
    expect(
      (await equipoApi.listarMios()).content.filter((e) => e.nombre === 'Los Retomados')
    ).toHaveLength(1);
  });

  it('muestra los datos del torneo de la inscripción: su nombre y el rango de la nómina', async () => {
    const { id } = await comoParticipante(() =>
      inscripcionApi.crear(TORNEO_GRATIS, {
        nombreEquipoNuevo: 'Los Del Slug',
        nomina: [JUGADOR_LUCAS],
      })
    );
    await renderRuta(`/inscripciones/${id}/nomina`);

    expect(await screen.findByText('Torneo Amistoso 3x3')).toBeInTheDocument();
    expect(screen.getByText('Nómina de al menos 3 jugadores')).toBeInTheDocument();
    expect(screen.queryByText('Torneo Apertura F5')).not.toBeInTheDocument();
  });

  it('una inscripción pendiente de pago no se edita acá: lleva al paso 2', async () => {
    const { id } = await comoParticipante(async () => {
      const creada = await inscripcionApi.crear(TORNEO_F5, {
        nombreEquipoNuevo: 'Los Que Pagan',
        nomina: [JUGADOR_LUCAS, JUGADOR_MATIAS, 103, 104],
      });
      return inscripcionApi.confirmar(creada.id, true);
    });
    expect((await inscripcionApi.obtener(id)).estado).toBe('PENDIENTE_PAGO');

    const { ubicacion } = await renderRuta(`/inscripciones/${id}/nomina`);

    await waitFor(() => expect(ubicacion()).toBe(`/inscripciones/${id}/pago`));
  });

  it('una inscripción confirmada tampoco: lleva al paso 2', async () => {
    const { id } = await comoParticipante(async () => {
      const creada = await inscripcionApi.crear(TORNEO_GRATIS, {
        nombreEquipoNuevo: 'Los Que Juegan',
        nomina: [JUGADOR_LUCAS, JUGADOR_MATIAS],
      });
      return inscripcionApi.confirmar(creada.id, true);
    });
    expect((await inscripcionApi.obtener(id)).estado).toBe('CONFIRMADA');

    const { ubicacion } = await renderRuta(`/inscripciones/${id}/nomina`);

    await waitFor(() => expect(ubicacion()).toBe(`/inscripciones/${id}/pago`));
  });

  it('mientras carga el borrador avisa que está cargando', async () => {
    server.use(http.get('*/inscripciones/:id', () => delay('infinite')));
    await renderRuta('/inscripciones/1000/nomina');

    expect(await screen.findByRole('status')).toHaveTextContent('Cargando inscripción');
  });

  it('una inscripción cancelada se avisa y no se edita', async () => {
    // 901 es la inscripción cancelada de Los Halcones en torneo-apertura-f5 (datos de los mocks).
    await renderRuta('/inscripciones/901/nomina');

    await screen.findByText(/Esta inscripción está cancelada/);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Esta inscripción está cancelada y ya no se puede modificar'
    );
    expect(screen.queryByLabelText('Equipo')).not.toBeInTheDocument();
  });

  it('avisa si la inscripción no existe', async () => {
    await renderRuta('/inscripciones/99999/nomina');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La inscripción no existe o no es tuya.'
    );
  });

  it('si la cuenta está bloqueada al cargar el borrador, lo explica con el texto de la inscripción', async () => {
    server.use(
      http.get('*/inscripciones/:id', () =>
        problema(403, 'USUARIO_BLOQUEADO', 'La cuenta tiene un bloqueo vigente')
      )
    );
    await renderRuta('/inscripciones/1000/nomina');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Tu cuenta, o la de un jugador de la nómina, tiene un bloqueo vigente'
    );
  });
});
