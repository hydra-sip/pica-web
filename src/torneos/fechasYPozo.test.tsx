import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GastoDetalle } from '../api/torneoApi';
import { PasoEconomia } from './components/PasoEconomia';
import { calcular } from './economia';
import { desdeTorneo, FormTorneo, validarBorrador } from './validacion';

const HORA = 60 * 60 * 1000;
const enDias = (dias: number) => new Date(Date.now() + dias * 24 * HORA);

/** Como lo tiene el input datetime-local: hora local, sin segundos. */
const local = (d: Date) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return z.toISOString().slice(0, 16);
};

const conFechas = (inicio: Date, cierre: Date): FormTorneo => ({
  ...desdeTorneo(null),
  nombre: 'Apertura F5',
  disciplina: 'Fútbol 5',
  fechaInicio: local(inicio),
  cierreInscripcionEn: local(cierre),
});

const limites = { cupoTope: 64, margenCierreInicioMin: 60 };

describe('margen entre el cierre de la inscripción y el inicio (CE4-5)', () => {
  const inicio = enDias(14);

  it('rechaza un cierre a menos del margen del inicio', () => {
    const errores = validarBorrador(
      conFechas(inicio, new Date(inicio.getTime() - HORA / 2)),
      limites
    );
    expect(errores.cierreInscripcionEn).toMatch(/al menos 1 h antes del inicio/);
  });

  it('acepta el cierre con el margen justo', () => {
    const errores = validarBorrador(conFechas(inicio, new Date(inicio.getTime() - HORA)), limites);
    expect(errores.cierreInscripcionEn).toBeUndefined();
  });

  it('en un torneo publicado no lo mira si no cambian las fechas', () => {
    const form = conFechas(inicio, inicio);
    const errores = validarBorrador({ ...form, nombre: 'Otro nombre' }, limites, form);
    expect(errores.cierreInscripcionEn).toBeUndefined();
  });
});

describe('pozo neto con el cupo mínimo (CE4-5)', () => {
  const gasto: GastoDetalle = {
    gastoId: 1,
    descripcion: 'Cancha',
    monto: 100_000,
    tipo: 'OTRO',
    estadoPago: 'PENDIENTE',
    beneficiario: null,
    abonadoEn: null,
    comprobante: null,
  };
  const form = { valorInscripcion: '10000', premios: ['100'] };

  it('hace la misma cuenta que el back al publicar', () => {
    const cuentas = calcular(form, 16, [gasto], 10, 4);
    expect(cuentas.pozoNeto).toBe(60_000);
    expect(cuentas.pozoNetoMinimo).toBe(-60_000);
  });

  it('el paso 3 avisa que con el mínimo no se va a poder publicar', () => {
    render(
      <PasoEconomia
        torneoId={1}
        form={form}
        onCambio={() => {}}
        errores={{}}
        habilitado={false}
        cupo={16}
        cupoMinimo={4}
        quienes="equipos"
        pctGastosAdministrativos={10}
        gastos={[gasto]}
        onGastos={() => {}}
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/cupo mínimo de 4 equipos/);
    expect(screen.getByText('Pozo neto si se inscriben solo 4 (cupo mínimo)')).toBeInTheDocument();
  });

  it('sin gastos que lo superen no avisa', () => {
    render(
      <PasoEconomia
        torneoId={1}
        form={form}
        onCambio={() => {}}
        errores={{}}
        habilitado={false}
        cupo={16}
        cupoMinimo={4}
        quienes="equipos"
        pctGastosAdministrativos={10}
        gastos={[{ ...gasto, monto: 30_000 }]}
        onGastos={() => {}}
      />
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
