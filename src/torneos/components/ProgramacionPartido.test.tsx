import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { PartidoBracket } from '../../api/torneoApi';
import { server } from '../../mocks/server';
import { fechaHora } from '../../shared/formato';
import { ProgramacionPartido } from './ProgramacionPartido';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const INICIO = '2026-12-10T21:00:00Z';
const FIN = '2026-12-20T01:00:00Z';

const partido: PartidoBracket = {
  id: 7,
  ronda: 1,
  posicion: 1,
  estado: 'PROGRAMADO',
  bye: false,
  local: null,
  visitante: null,
  cancha: null,
  fechaProgramada: null,
  arbitro: null,
};

/** El 400 que arma ProgramacionService.validar con la regla que rompe la fecha. */
const rechazarCon = (mensaje: string) =>
  server.use(
    http.put(`${API_URL}/partidos/:id/programacion`, () =>
      HttpResponse.json(
        {
          status: 400,
          codigo: 'VALIDACION',
          detail: 'Hay campos inválidos',
          errores: [{ campo: 'fechaProgramada', codigo: 'RANGO_INVALIDO', mensaje }],
        },
        { status: 400, headers: { 'Content-Type': 'application/problem+json' } }
      )
    )
  );

const programar = async (fecha: string) => {
  const user = userEvent.setup();
  render(
    <ProgramacionPartido
      partido={partido}
      editable
      inicioTorneo={INICIO}
      finTorneo={FIN}
      onProgramado={() => {}}
    />
  );
  await user.click(screen.getByRole('button', { name: 'Programar' }));
  const input = screen.getByLabelText('Fecha y hora del partido 1-1');
  // user-event no sabe escribir en un datetime-local de jsdom
  fireEvent.change(input, { target: { value: fecha } });
  await user.click(screen.getByRole('button', { name: 'Guardar' }));
  return input;
};

describe('programar un partido con la fecha fuera de rango (CE4-9)', () => {
  it('muestra el rango del torneo, con hora, al lado del campo', async () => {
    const user = userEvent.setup();
    render(
      <ProgramacionPartido
        partido={partido}
        editable
        inicioTorneo={INICIO}
        finTorneo={FIN}
        onProgramado={() => {}}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Programar' }));

    const rango = `Entre el ${fechaHora(INICIO)} y el ${fechaHora(FIN)}.`;
    expect(screen.getByText(rango)).toBeInTheDocument();
    expect(screen.getByLabelText('Fecha y hora del partido 1-1')).toHaveAccessibleDescription(
      rango
    );
  });

  it('sin fin del torneo, el rango dice solo desde cuándo', async () => {
    const user = userEvent.setup();
    render(
      <ProgramacionPartido
        partido={partido}
        editable
        inicioTorneo={INICIO}
        onProgramado={() => {}}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Programar' }));

    expect(screen.getByText(`Desde el ${fechaHora(INICIO)}.`)).toBeInTheDocument();
  });

  it('con una fecha pasada, dice que no puede ser pasada', async () => {
    rechazarCon('No puede ser pasada');
    await programar('2020-01-01T10:00');

    expect(await screen.findByRole('alert')).toHaveTextContent('No puede ser pasada.');
  });

  it('con una fecha anterior al inicio, lo dice y sigue mostrando desde cuándo se puede', async () => {
    rechazarCon('No puede ser anterior al inicio del torneo');
    await programar('2026-12-01T10:00');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No puede ser anterior al inicio del torneo.'
    );
    expect(screen.getByText(new RegExp(`Entre el ${fechaHora(INICIO)}`))).toBeInTheDocument();
  });

  it('con una fecha posterior al fin, dice que no puede ser posterior al fin', async () => {
    rechazarCon('No puede ser posterior al fin del torneo');
    await programar('2026-12-30T10:00');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No puede ser posterior al fin del torneo.'
    );
  });
});
