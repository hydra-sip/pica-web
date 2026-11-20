import { act, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Notificacion } from '../api/notificacionApi';
import { agregarNotificacionMock } from '../mocks/notificacionHandlers';
import { websocketService } from '../realtime/websocketService';
import { renderRuta } from '../test/renderRuta';

// El participante de los mocks (usuario / user123)
const PARTICIPANTE = 2;

const rival = (titulo = 'Tu rival en Semifinal: La Furia FC') =>
  agregarNotificacionMock(PARTICIPANTE, {
    tipo: 'RIVAL_ASIGNADO',
    titulo,
    cuerpo: 'En Semifinal de Copa Apertura jugás contra La Furia FC.',
    enlace: '/partidos/15',
  });

const enVivo = (): Notificacion => ({
  id: 99,
  tipo: 'CHECKIN_ABIERTO',
  titulo: 'Se abrió el check-in de tu partido contra La Furia FC',
  cuerpo: 'Ya podés confirmar tu presencia. El check-in cierra el 20/11 a las 21:30.',
  enlace: '/billetera',
  datos: { partidoId: 15 },
  leidaEn: null,
  creadaEn: new Date().toISOString(),
});

const campana = () => screen.getByRole('link', { name: /^Notificaciones: \d+ sin leer$/ });

describe('Campana y centro de notificaciones (HU-808)', () => {
  it('la campana muestra cuántas no leyó al entrar', async () => {
    rival();
    rival('Tu rival en Final: Los Halcones');

    await renderRuta('/');

    await waitFor(() => expect(campana()).toHaveAccessibleName('Notificaciones: 2 sin leer'));
    expect(within(campana()).getByText('2')).toBeInTheDocument();
  });

  it('una notificación que llega en vivo suma a la campana y aparece en un aviso que lleva a su enlace', async () => {
    // una ya guardada: así se sabe que llegó el contador de la API antes de que llegue la nueva
    rival();
    const { user, ubicacion } = await renderRuta('/');
    await waitFor(() => expect(campana()).toHaveAccessibleName('Notificaciones: 1 sin leer'));

    act(() => websocketService.mockEmitNotificacion(enVivo()));

    const aviso = await screen.findByRole('status', { name: 'Nueva notificación' });
    expect(within(aviso).getByText('Se abrió el check-in de tu partido contra La Furia FC')).toBeInTheDocument();
    expect(campana()).toHaveAccessibleName('Notificaciones: 2 sin leer');

    await user.click(within(aviso).getByRole('button', { name: /Se abrió el check-in/ }));
    expect(ubicacion()).toBe('/billetera');
    expect(screen.queryByRole('status', { name: 'Nueva notificación' })).not.toBeInTheDocument();
  });

  it('el centro las muestra de la más nueva a la más vieja y al tocar una la marca leída y va a su enlace', async () => {
    rival('Tu rival en Semifinal: La Furia FC');
    agregarNotificacionMock(PARTICIPANTE, {
      tipo: 'RECLAMO_RESUELTO',
      titulo: 'Se acreditaron $ 50.000,00 en tu billetera',
      cuerpo: 'Se liberaron los fondos de la rifa "Rifa Solidaria".',
      enlace: '/billetera',
      creadaEn: new Date(Date.now() + 60_000).toISOString(),
    });
    const { user, ubicacion } = await renderRuta('/notificaciones');

    const tarjetas = await screen.findAllByRole('button', { name: /^Nueva: / });
    expect(tarjetas.map((t) => t.getAttribute('aria-label'))).toEqual([
      'Nueva: Se acreditaron $ 50.000,00 en tu billetera',
      'Nueva: Tu rival en Semifinal: La Furia FC',
    ]);
    expect(within(tarjetas[0]).getByText('Nueva')).toBeInTheDocument();
    expect(within(tarjetas[0]).getByText(/Ver saldo en Billetera/)).toBeInTheDocument();
    expect(within(tarjetas[1]).getByText(/Ver detalles del cruce/)).toBeInTheDocument();

    await user.click(tarjetas[0]);

    expect(ubicacion()).toBe('/billetera');
    await waitFor(() => expect(campana()).toHaveAccessibleName('Notificaciones: 1 sin leer'));
  });

  it('una ya leída no lleva la etiqueta "Nueva"', async () => {
    agregarNotificacionMock(PARTICIPANTE, {
      tipo: 'RIVAL_ASIGNADO',
      titulo: 'Tu rival en Final: Los Halcones',
      cuerpo: 'En Final de Copa Apertura jugás contra Los Halcones.',
      enlace: '/partidos/16',
      leidaEn: new Date().toISOString(),
    });
    await renderRuta('/notificaciones');

    const tarjeta = await screen.findByRole('button', { name: 'Tu rival en Final: Los Halcones' });
    expect(within(tarjeta).queryByText('Nueva')).not.toBeInTheDocument();
    // no queda ninguna sin leer: no hay nada que marcar
    expect(screen.queryByRole('button', { name: 'Marcar todas como leídas' })).not.toBeInTheDocument();
  });

  it('las pestañas muestran todas, solo las no leídas o solo las leídas', async () => {
    rival('Tu rival en Semifinal: La Furia FC');
    agregarNotificacionMock(PARTICIPANTE, {
      tipo: 'RIVAL_ASIGNADO',
      titulo: 'Tu rival en Final: Los Halcones',
      cuerpo: 'En Final de Copa Apertura jugás contra Los Halcones.',
      enlace: '/partidos/16',
      leidaEn: new Date().toISOString(),
    });
    const { user } = await renderRuta('/notificaciones');

    expect(await screen.findByRole('tab', { name: 'Todas' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('button', { name: 'Nueva: Tu rival en Semifinal: La Furia FC' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tu rival en Final: Los Halcones' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'No leídas' }));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Tu rival en Final: Los Halcones' })).not.toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: 'Nueva: Tu rival en Semifinal: La Furia FC' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Leídas' }));
    expect(await screen.findByRole('button', { name: 'Tu rival en Final: Los Halcones' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Nueva: / })).not.toBeInTheDocument();
  });

  it('"Marcar todas como leídas" las pasa a leídas, vacía No leídas y la campana vuelve a cero', async () => {
    rival();
    rival('Tu rival en Final: Los Halcones');
    const { user } = await renderRuta('/notificaciones');
    await user.click(await screen.findByRole('tab', { name: 'No leídas' }));
    await waitFor(() => expect(screen.getAllByRole('button', { name: /^Nueva: / })).toHaveLength(2));

    await user.click(screen.getByRole('button', { name: 'Marcar todas como leídas' }));

    expect(await screen.findByText('No tenés notificaciones sin leer.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Marcar todas como leídas' })).not.toBeInTheDocument();
    await waitFor(() => expect(campana()).toHaveAccessibleName('Notificaciones: 0 sin leer'));

    await user.click(screen.getByRole('tab', { name: 'Leídas' }));
    await waitFor(() => expect(screen.getAllByRole('button', { name: /^Tu rival en / })).toHaveLength(2));
  });

  it('en el centro, la que llega en vivo aparece arriba sin recargar', async () => {
    rival();
    await renderRuta('/notificaciones');
    await screen.findByRole('button', { name: /Tu rival en Semifinal/ });

    act(() => websocketService.mockEmitNotificacion(enVivo()));

    const tarjetas = await screen.findAllByRole('button', { name: /^Nueva: / });
    expect(tarjetas[0]).toHaveAccessibleName('Nueva: Se abrió el check-in de tu partido contra La Furia FC');
    expect(within(tarjetas[0]).getByText(/Toca para confirmar presencia/)).toBeInTheDocument();
  });

  it('sin notificaciones, el centro lo dice', async () => {
    await renderRuta('/notificaciones');

    expect(await screen.findByText(/Todavía no tenés notificaciones/)).toBeInTheDocument();
  });

  it('sin sesión no hay campana y el centro pide iniciar sesión', async () => {
    const { ubicacion } = await renderRuta('/notificaciones', { usuario: 'anonimo' });

    await waitFor(() => expect(ubicacion()).toBe('/auth/login'));
    expect(screen.queryByRole('link', { name: /^Notificaciones/ })).not.toBeInTheDocument();
  });
});
