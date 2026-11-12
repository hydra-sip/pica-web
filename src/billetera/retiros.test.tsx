import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderRuta } from '../test/renderRuta';
import {
  setBilleteraMock,
  setCuentasBancariasMock,
} from '../mocks/data';

describe('HU-607 / T607-3 (PICA-338): Front cuentas y retiro en Mi billetera', () => {
  it('muestra la sección de cuentas bancarias con su estado y permite registrar una nueva cuenta validada', async () => {
    const { user } = await renderRuta('/billetera', { usuario: 'participante' });

    expect(await screen.findByRole('heading', { name: 'Mi billetera' })).toBeInTheDocument();

    // 1. Sección de cuentas bancarias visible
    expect(screen.getByRole('heading', { name: 'Cuentas bancarias' })).toBeInTheDocument();
    const listaCuentas = await screen.findByTestId('lista-cuentas-bancarias');

    // Cuenta inicial CBU 0170099220000012345678 en estado Validada
    expect(within(listaCuentas).getByText('0170099220000012345678')).toBeInTheDocument();
    expect(within(listaCuentas).getByText('Validada')).toBeInTheDocument();
    expect(within(listaCuentas).getByText('Usuario PICA')).toBeInTheDocument();

    // 2. Abrir modal para agregar cuenta
    const btnAgregar = screen.getByRole('button', { name: '+ Agregar cuenta' });
    await user.click(btnAgregar);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Agregar cuenta bancaria' })).toBeInTheDocument();

    // Cambiar a ALIAS
    const selectTipo = screen.getByLabelText(/Tipo de cuenta/i);
    await user.selectOptions(selectTipo, 'ALIAS');

    const inputValor = screen.getByLabelText(/Alias/i);
    await user.type(inputValor, 'mi.alias.pica');

    const inputTitular = screen.getByLabelText(/Nombre y apellido del titular/i);
    await user.type(inputTitular, 'Usuario PICA');

    // CUIT que contiene el DNI del usuario mock participante (38123456)
    const inputCuit = screen.getByLabelText(/CUIT \/ CUIL del titular/i);
    await user.type(inputCuit, '20381234567');

    const btnGuardar = screen.getByRole('button', { name: 'Guardar cuenta' });
    await user.click(btnGuardar);

    // Modal se cierra y la nueva cuenta aparece en la lista
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    expect(await within(listaCuentas).findByText('mi.alias.pica')).toBeInTheDocument();
    expect(screen.getByText(/Cuenta bancaria agregada y validada con éxito/i)).toBeInTheDocument();
  });

  it('muestra el mensaje del backend si el titular/CUIT no coincide con el titular verificado (AC2)', async () => {
    const { user } = await renderRuta('/billetera', { usuario: 'participante' });

    expect(await screen.findByRole('heading', { name: 'Mi billetera' })).toBeInTheDocument();
    expect(await screen.findByTestId('lista-cuentas-bancarias')).toBeInTheDocument();

    const btnAgregar = screen.getByRole('button', { name: '+ Agregar cuenta' });
    await user.click(btnAgregar);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    // CBU válido
    const inputValor = screen.getByLabelText(/CBU/i);
    await user.type(inputValor, '1234567890123456789012');

    const inputTitular = screen.getByLabelText(/Nombre y apellido del titular/i);
    await user.type(inputTitular, 'Juan Pérez');

    // CUIT con DNI ajeno (99999999 en vez de 38123456)
    const inputCuit = screen.getByLabelText(/CUIT \/ CUIL del titular/i);
    await user.type(inputCuit, '20999999997');

    const btnGuardar = screen.getByRole('button', { name: 'Guardar cuenta' });
    await user.click(btnGuardar);

    // Muestra el mensaje exacto exigido por AC2 de HU-607
    const mensajesTitular = await screen.findAllByText(
      'La cuenta destino debe estar a nombre del titular verificado en la plataforma'
    );
    expect(mensajesTitular.length).toBeGreaterThanOrEqual(1);
  });

  it('muestra el estado RECHAZADA con su mensaje contextual si una cuenta fue rechazada', async () => {
    setCuentasBancariasMock([
      {
        id: 99,
        tipo: 'CBU',
        valor: '9999999999999999999999',
        titular: 'Tercero Ajeno',
        cuitCuil: '20999999997',
        estadoValidacion: 'RECHAZADA',
        validadaEn: null,
        creadoEn: '2026-11-05T10:00:00Z',
      },
    ]);

    await renderRuta('/billetera', { usuario: 'participante' });

    expect(await screen.findByRole('heading', { name: 'Mi billetera' })).toBeInTheDocument();

    expect(await screen.findByText('Rechazada')).toBeInTheDocument();
    expect(
      screen.getByText(
        'La cuenta destino debe estar a nombre del titular verificado en la plataforma'
      )
    ).toBeInTheDocument();
  });

  it('permite eliminar una cuenta bancaria de la lista', async () => {
    const { user } = await renderRuta('/billetera', { usuario: 'participante' });

    expect(await screen.findByRole('heading', { name: 'Mi billetera' })).toBeInTheDocument();
    const listaCuentas = await screen.findByTestId('lista-cuentas-bancarias');
    expect(within(listaCuentas).getByText('0170099220000012345678')).toBeInTheDocument();

    // Botón eliminar
    const btnEliminar = screen.getByRole('button', {
      name: /Eliminar cuenta 0170099220000012345678/i,
    });
    await user.click(btnEliminar);

    // Se remueve de la lista
    await waitFor(() => {
      expect(screen.queryByText('0170099220000012345678')).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Cuenta bancaria eliminada/i)).toBeInTheDocument();
  });

  it('el modal de retiro muestra los topes mínimo y máximo y deshabilita confirmación si está fuera de topes (AC3)', async () => {
    setBilleteraMock({ saldoDisponible: 1000000 });
    const { user } = await renderRuta('/billetera', { usuario: 'participante' });

    expect(await screen.findByRole('heading', { name: 'Mi billetera' })).toBeInTheDocument();

    const btnRetirar = screen.getByRole('button', { name: 'Retirar fondos' });
    await user.click(btnRetirar);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Retirar fondos' })).toBeInTheDocument();

    // Límites visibles: Mínimo $ 1.000,00 · Máximo $ 500.000,00
    expect(within(dialog).getByText(/Mínimo \$ 1\.000,00 · Máximo \$ 500\.000,00/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/\$ 1\.000\.000,00/)).toBeInTheDocument();

    const inputMonto = screen.getByLabelText(/Monto a retirar/i);
    const btnConfirmar = screen.getByRole('button', { name: 'Confirmar retiro' });

    // 1. Monto menor al mínimo ($500 < $1.000)
    await user.type(inputMonto, '500');
    expect(btnConfirmar).toBeDisabled();
    expect(
      screen.getByText(/El monto mínimo de retiro permitido es de \$ 1\.000,00/i)
    ).toBeInTheDocument();

    // 2. Limpiar e ingresar monto mayor al máximo ($600.000 > $500.000)
    await user.clear(inputMonto);
    await user.type(inputMonto, '600000');
    expect(btnConfirmar).toBeDisabled();
    expect(
      screen.getByText(/El monto máximo de retiro permitido es de \$ 500\.000,00/i)
    ).toBeInTheDocument();
  });

  it('deshabilita el botón y muestra advertencia explícita sobre custodia si el monto supera el saldo disponible (AC4)', async () => {
    const { user } = await renderRuta('/billetera', { usuario: 'participante' });

    expect(await screen.findByRole('heading', { name: 'Mi billetera' })).toBeInTheDocument();

    const btnRetirar = screen.getByRole('button', { name: 'Retirar fondos' });
    await user.click(btnRetirar);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    const inputMonto = screen.getByLabelText(/Monto a retirar/i);
    const btnConfirmar = screen.getByRole('button', { name: 'Confirmar retiro' });

    // Saldo disponible es $15.000. Ingresamos $18.000
    await user.type(inputMonto, '18000');

    expect(btnConfirmar).toBeDisabled();
    expect(
      screen.getByText(
        /El monto supera el saldo disponible\. Los fondos retenidos en custodia no se pueden movilizar\./i
      )
    ).toBeInTheDocument();
  });

  it('procesa el retiro exitosamente, descuenta saldo disponible y refleja el movimiento como "En proceso" (AC5 y AC6)', async () => {
    const { user } = await renderRuta('/billetera', { usuario: 'participante' });

    expect(await screen.findByRole('heading', { name: 'Mi billetera' })).toBeInTheDocument();

    const gridSaldos = screen.getByTestId('indicadores-saldo');
    expect(await within(gridSaldos).findByText(/\$ 15\.000,00/)).toBeInTheDocument();

    const btnRetirar = screen.getByRole('button', { name: 'Retirar fondos' });
    await user.click(btnRetirar);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    const inputMonto = screen.getByLabelText(/Monto a retirar/i);
    await user.type(inputMonto, '5000');

    const btnConfirmar = screen.getByRole('button', { name: 'Confirmar retiro' });
    expect(btnConfirmar).not.toBeDisabled();
    await user.click(btnConfirmar);

    // Modal se cierra
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Saldo disponible descontado: 15.000 - 5.000 = 10.000
    expect(await within(gridSaldos).findByText(/\$ 10\.000,00/)).toBeInTheDocument();
    expect(
      screen.getByText(
        /Solicitud de retiro por \$ 5\.000,00 enviada\. Tu transferencia se encuentra en proceso\./i
      )
    ).toBeInTheDocument();

    // Historial de movimientos: el retiro aparece con signo negativo, tipo Retiro y estado "En proceso"
    expect(await screen.findByText('Retiro')).toBeInTheDocument();
    expect(screen.getByText(/-\s*\$\s*5\.000,00/)).toBeInTheDocument();
    expect(screen.getByText('En proceso')).toBeInTheDocument();
  });

  it('deshabilita los botones de acción si la billetera está bloqueada', async () => {
    setBilleteraMock({ estado: 'BLOQUEADA' });

    await renderRuta('/billetera', { usuario: 'participante' });

    expect(await screen.findByRole('heading', { name: 'Mi billetera' })).toBeInTheDocument();

    const btnRetirar = screen.getByRole('button', { name: 'Retirar fondos' });
    expect(btnRetirar).toBeDisabled();

    const btnCargar = screen.getByRole('button', { name: 'Cargar saldo' });
    expect(btnCargar).toBeDisabled();

    const btnAgregarCuenta = screen.getByRole('button', { name: '+ Agregar cuenta' });
    expect(btnAgregarCuenta).toBeDisabled();
  });
});
