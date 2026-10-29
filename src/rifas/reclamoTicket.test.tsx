import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderRuta } from '../test/renderRuta';

describe('HU-506 / T506-2: Reclamo de resultado de rifa en el ticket', () => {
  it('Criterio 1: Intentar reclamar el resultado de una rifa pasadas las 48 horas de finalizada y comprobar que se indica error', async () => {
    // Ticket 1002: rifa sorteada hace 72 horas (fuera de las 48 horas reglamentarias)
    const { user } = await renderRuta('/tickets/1002');

    // 1. Comprobar que carga el ticket con la ventana vencida
    await screen.findByText('Rifa con Ventana Vencida');
    expect(screen.getByText('T-VENCIDO')).toBeInTheDocument();

    const avisoVentana = screen.getByTestId('aviso-ventana-reclamo');
    expect(avisoVentana).toHaveTextContent(/ventana de reclamo cerrada/i);
    expect(avisoVentana).toHaveTextContent(/plazo reglamentario de 48 horas/i);

    // 2. Intentar reclamar
    const btnReclamar = screen.getByRole('button', { name: /reclamar resultado/i });
    await user.click(btnReclamar);

    // 3. Modal de reclamo abierto
    expect(screen.getByText('Reclamar resultado del sorteo')).toBeInTheDocument();
    const textarea = screen.getByLabelText(/motivo del reclamo/i);
    await user.type(textarea, 'Disputo el sorteo porque hubo una inconsistencia');

    // 4. Enviar reclamo fuera de ventana
    const btnConfirmar = screen.getByRole('button', { name: /confirmar reclamo/i });
    await user.click(btnConfirmar);

    // 5. Comprobar que se indica error de ventana de 48h vencida
    const alertaError = await screen.findByRole('alert');
    expect(alertaError).toBeInTheDocument();
    expect(alertaError).toHaveTextContent(
      'La ventana de 48 horas para reclamar el resultado de la rifa ya cerró.'
    );
  });

  it('Criterio 2: Intentar reclamar sin haber comprado un ticket de esa rifa y comprobar que se indica error', async () => {
    // Ticket 1003: pertenece a otro comprador (compradorId 999, rifaId 30)
    const { user } = await renderRuta('/tickets/1003');

    await screen.findByText('Rifa de Otro Usuario');
    expect(screen.getByText('T-AJENO')).toBeInTheDocument();

    // 1. Abrir modal de reclamo
    const btnReclamar = screen.getByRole('button', { name: /reclamar resultado/i });
    await user.click(btnReclamar);

    // 2. Ingresar motivo
    const textarea = screen.getByLabelText(/motivo del reclamo/i);
    await user.type(textarea, 'Intento reclamar esta rifa sin poseer ticket válido');

    // 3. Confirmar envío
    const btnConfirmar = screen.getByRole('button', { name: /confirmar reclamo/i });
    await user.click(btnConfirmar);

    // 4. Comprobar que se indica error de no comprador
    const alertaError = await screen.findByRole('alert');
    expect(alertaError).toBeInTheDocument();
    expect(alertaError).toHaveTextContent(
      'No podés reclamar: no tenés un ticket comprado para esta rifa.'
    );
  });

  it('Criterio 3: Reclamar dentro de la ventana de 48 horas y comprobar que el reclamo queda registrado y notificado al organizador', async () => {
    // Ticket 1001: sorteada hace 5h (dentro de las 48h), comprador es el usuario logueado
    const { user } = await renderRuta('/tickets/1001');

    await screen.findByText('Gran Rifa Benéfica de la Copa');
    expect(screen.getByText('SEED-0001')).toBeInTheDocument();

    // Comprobar ventana abierta
    const avisoVentana = screen.getByTestId('aviso-ventana-reclamo');
    expect(avisoVentana).toHaveTextContent(/ventana de reclamo abierta/i);
    expect(avisoVentana).toHaveTextContent(/48 horas/i);

    // Estado inicial: Sorteada
    expect(screen.getByText('Sorteada')).toBeInTheDocument();

    // 1. Clic en botón Reclamar
    const btnReclamar = screen.getByRole('button', { name: /reclamar resultado/i });
    await user.click(btnReclamar);

    // 2. Validar que motivo vacío no envía
    const btnConfirmar = screen.getByRole('button', { name: /confirmar reclamo/i });
    await user.click(btnConfirmar);
    expect(await screen.findByText('El motivo del reclamo es obligatorio.')).toBeInTheDocument();

    // 3. Completar motivo
    const textarea = screen.getByLabelText(/motivo del reclamo/i);
    await user.type(textarea, 'La semilla revelada difiere del hash de compromiso publicado.');

    // 4. Confirmar envío dentro de plazo
    await user.click(btnConfirmar);

    // 5. Comprobar mensaje de éxito en modal y registro notificado
    const alertaModal = await screen.findByRole('status');
    expect(alertaModal).toHaveTextContent(/reclamo registrado con éxito/i);
    expect(alertaModal).toHaveTextContent(/organizador/i);

    // 6. Comprobar que en la página se actualiza y muestra notificación
    const alertaPagina = await screen.findByTestId('alerta-exito-reclamo');
    expect(alertaPagina).toHaveTextContent(/organizador/i);
    expect(alertaPagina).toHaveTextContent(/en revisión/i);
  });

  it('Criterio 4: Comprobar que, mientras el reclamo está pendiente de resolución, el estado de la rifa lo refleja ("En revisión")', async () => {
    // Ticket 1004: ya posee un reclamo registrado pendiente de resolución
    await renderRuta('/tickets/1004');

    await screen.findByText('Rifa en Revisión por Disputa');

    // 1. El estado de la rifa refleja "En revisión"
    const badgesEnRevision = screen.getAllByText('En revisión');
    expect(badgesEnRevision.length).toBeGreaterThanOrEqual(1);

    // 2. Badge de reclamo en trámite
    expect(screen.getByTestId('badge-reclamo-tramite')).toHaveTextContent(/reclamo en trámite/i);

    // 3. Sección con el detalle del reclamo pendiente
    const seccionReclamo = screen.getByTestId('seccion-reclamo-activo');
    expect(seccionReclamo).toBeInTheDocument();
    expect(seccionReclamo).toHaveTextContent(
      'Discrepancia detectada en la semilla publicada del sorteo'
    );
    expect(seccionReclamo).toHaveTextContent(/notificado al organizador/i);
    expect(seccionReclamo).toHaveTextContent(/permanece en revisión mientras se evalúa la disputa/i);

    // 4. El botón "Reclamar resultado" ya no está disponible
    expect(screen.queryByRole('button', { name: /reclamar resultado/i })).not.toBeInTheDocument();
    expect(screen.getByText('Reclamo en revisión')).toBeInTheDocument();
  });

  it('Mis tickets lista los comprobantes del comprador con su estado y accesos', async () => {
    await renderRuta('/mis-tickets');

    await screen.findByText('Mis Tickets de Rifa');
    expect(await screen.findByText('SEED-0001')).toBeInTheDocument();
    expect(screen.getByText('T-VENCIDO')).toBeInTheDocument();
    expect(screen.getByText('T-EN-REVISION')).toBeInTheDocument();

    // Ver comprobante
    const linksComprobante = screen.getAllByRole('link', { name: /ver comprobante/i });
    expect(linksComprobante.length).toBe(3);
  });

  it('El ticket incluye enlace directo al portal de verificación criptográfica', async () => {
    await renderRuta('/tickets/1001');

    await screen.findByText('Gran Rifa Benéfica de la Copa');
    const linkVerificar = screen.getByRole('link', { name: /verificar sorteo en portal público/i });
    expect(linkVerificar).toBeInTheDocument();
    expect(linkVerificar).toHaveAttribute('href', '/verificacion');
  });
});
