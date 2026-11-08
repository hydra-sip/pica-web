import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../mocks/server';
import { renderRuta } from '../test/renderRuta';
import {
  setBilleteraMock,
  setMovimientosMock,
} from '../mocks/data';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

describe('HU-602 / T602-3 (PICA-319): Mi billetera con saldos, movimientos y Cargar saldo', () => {
  it('muestra los tres indicadores de saldo y la lista de movimientos con sus signos y enlaces', async () => {
    const { ubicacion } = await renderRuta('/billetera', { usuario: 'participante' });

    expect(ubicacion()).toBe('/billetera');
    expect(await screen.findByRole('heading', { name: 'Mi billetera' })).toBeInTheDocument();

    // 1. Tres indicadores de saldo en pesos
    const gridSaldos = screen.getByTestId('indicadores-saldo');
    expect(await within(gridSaldos).findByText(/\$ 15\.000,00/)).toBeInTheDocument();
    expect(within(gridSaldos).getByText('Disponible')).toBeInTheDocument();

    expect(within(gridSaldos).getByText('Retenido (en custodia)')).toBeInTheDocument();
    expect(within(gridSaldos).getByText(/\$ 5\.000,00/)).toBeInTheDocument();

    expect(within(gridSaldos).getByText('Ganancia acumulada')).toBeInTheDocument();
    expect(within(gridSaldos).getByText(/\$ 8\.500,00/)).toBeInTheDocument();

    // 2. Movimientos con tipos en español y signos
    expect(await screen.findByText('Carga de saldo')).toBeInTheDocument();
    expect(screen.getByText(/\+\s*\$\s*10\.000,00/)).toBeInTheDocument();

    expect(screen.getByText('Premio')).toBeInTheDocument();
    expect(screen.getByText(/\+\s*\$\s*7\.500,00/)).toBeInTheDocument();

    expect(screen.getByText('Inscripción')).toBeInTheDocument();
    expect(screen.getByText(/-\s*\$\s*2\.500,00/)).toBeInTheDocument();

    expect(screen.getByText('Compra de números')).toBeInTheDocument();
    expect(screen.getByText(/-\s*\$\s*1\.000,00/)).toBeInTheDocument();

    // 3. Enlaces contextuales a torneos y rifas
    const linkTorneo = screen.getByRole('link', { name: 'Torneo Relámpago Apertura' });
    expect(linkTorneo).toHaveAttribute('href', '/torneos/torneo-relampago-apertura');

    const linkRifa = screen.getByRole('link', { name: 'Gran Rifa Solidaria' });
    expect(linkRifa).toHaveAttribute('href', '/rifas/1');
  });

  it('muestra el estado vacío invitando a cargar cuando no hay movimientos', async () => {
    setMovimientosMock([]);

    await renderRuta('/billetera', { usuario: 'participante' });

    expect(await screen.findByRole('heading', { name: 'Mi billetera' })).toBeInTheDocument();
    expect(
      await screen.findByText(/Todavía no tenés movimientos en tu billetera/i)
    ).toBeInTheDocument();

    // Botón visible para cargar saldo dentro del estado vacío y en el header
    const botonesCargar = screen.getAllByRole('button', { name: 'Cargar saldo' });
    expect(botonesCargar.length).toBeGreaterThanOrEqual(1);
  });

  it('permite cargar saldo desde el modal y actualiza los saldos y movimientos sin recargar la página', async () => {
    const { user } = await renderRuta('/billetera', { usuario: 'participante' });

    expect(await screen.findByRole('heading', { name: 'Mi billetera' })).toBeInTheDocument();
    const gridSaldos = screen.getByTestId('indicadores-saldo');
    expect(await within(gridSaldos).findByText(/\$ 15\.000,00/)).toBeInTheDocument();

    // Abrir modal de carga
    const botonCargarHeader = screen.getAllByRole('button', { name: 'Cargar saldo' })[0];
    await user.click(botonCargarHeader);

    // Modal abierto
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cargar saldo' })).toBeInTheDocument();

    const inputMonto = screen.getByLabelText(/Monto a cargar/i);
    await user.type(inputMonto, '5000');

    // Confirmar carga
    const botonConfirmar = screen.getByRole('button', { name: 'Confirmar carga' });
    await user.click(botonConfirmar);

    // Modal se cierra y se actualiza el saldo disponible a $ 20.000,00
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    expect(await within(screen.getByTestId('indicadores-saldo')).findByText(/\$ 20\.000,00/)).toBeInTheDocument();
    expect(
      screen.getByText(/Se acreditaron \$ 5\.000,00 en tu billetera con éxito/i)
    ).toBeInTheDocument();
  });

  it('muestra errores en el modal de carga con mensajeDeError si falla el backend', async () => {
    server.use(
      http.post(`${API_URL}/billetera/cargas`, () => {
        return new HttpResponse(
          JSON.stringify({
            status: 403,
            codigo: 'BILLETERA_BLOQUEADA',
            detail: 'Tu billetera se encuentra bloqueada.',
          }),
          { status: 403, headers: { 'Content-Type': 'application/problem+json' } }
        );
      })
    );

    const { user } = await renderRuta('/billetera', { usuario: 'participante' });

    expect(await screen.findByRole('heading', { name: 'Mi billetera' })).toBeInTheDocument();

    const botonCargarHeader = screen.getAllByRole('button', { name: 'Cargar saldo' })[0];
    await user.click(botonCargarHeader);

    const inputMonto = await screen.findByLabelText(/Monto a cargar/i);
    await user.type(inputMonto, '2000');

    const botonConfirmar = screen.getByRole('button', { name: 'Confirmar carga' });
    await user.click(botonConfirmar);

    // El modal muestra la alerta con el mensaje resuelto por mensajeDeError
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Tu billetera está bloqueada. Ponete en contacto con soporte si creés que es un error.'
    );
  });

  it('si la billetera está bloqueada, muestra la advertencia y el botón de carga aparece deshabilitado', async () => {
    setBilleteraMock({ estado: 'BLOQUEADA' });

    await renderRuta('/billetera', { usuario: 'participante' });

    expect(await screen.findByRole('heading', { name: 'Mi billetera' })).toBeInTheDocument();
    expect(screen.getByText(/Tu billetera está bloqueada temporalmente/i)).toBeInTheDocument();

    const botonCargar = screen.getByRole('button', { name: 'Cargar saldo' });
    expect(botonCargar).toBeDisabled();
  });

  it('el ítem Billetera aparece en la barra de navegación para usuarios con sesión', async () => {
    await renderRuta('/', { usuario: 'participante' });

    const [lateral, inferior] = await screen.findAllByRole('navigation', {
      name: 'Navegación principal',
    });
    expect(within(lateral).getByRole('link', { name: /Billetera/ })).toHaveAttribute(
      'href',
      '/billetera'
    );
    expect(within(inferior).getByRole('link', { name: /Billetera/ })).toHaveAttribute(
      'href',
      '/billetera'
    );
  });
});
