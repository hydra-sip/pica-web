import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { IngresoInscripcion } from '../api/custodiaApi';
import { server } from '../mocks/server';
import { LibroDeIngresos } from './components/LibroDeIngresos';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const pago = (i: number, cambios: Partial<IngresoInscripcion> = {}): IngresoInscripcion => ({
  movimientoId: 100 + i,
  comprobante: `I7-${100 + i}`,
  pagadoEn: `2026-11-${String(10 + (i % 15)).padStart(2, '0')}T15:00:00Z`,
  inscripcionId: i,
  equipoNombre: `Equipo ${i}`,
  pagadorNombre: `Capitán ${i}`,
  pagadorUsername: `capitan${i}`,
  monto: 20000,
  gastosAdministrativos: 2000,
  total: 22000,
  estado: 'CONFIRMADO',
  ...cambios,
});

const libro = (ingresos: IngresoInscripcion[]) => {
  server.use(http.get(`${API_URL}/torneos/7/ingresos`, () => HttpResponse.json(ingresos)));
  render(<LibroDeIngresos torneoId={7} />);
  return userEvent.setup();
};

const filas = async () => {
  const tabla = await screen.findByRole('table', { name: /Pagos de inscripción/ });
  return within(tabla).getAllByRole('row').slice(1);
};

describe('Libro de ingresos por inscripción (HU-608)', () => {
  it('muestra cada pago con el equipo, el capitán, la inscripción, los gastos y el total', async () => {
    libro([
      pago(1, {
        equipoNombre: 'Deportivo Luján',
        pagadorNombre: 'Matías Gómez',
        pagadorUsername: 'mgomez',
      }),
    ]);

    expect(
      await screen.findByRole('heading', { name: 'Libro de ingresos por inscripción (1 registro)' })
    ).toBeInTheDocument();
    const [fila] = await filas();
    expect(fila).toHaveTextContent('I7-101');
    expect(fila).toHaveTextContent('Deportivo Luján');
    expect(fila).toHaveTextContent('Matías Gómez @mgomez');
    expect(fila).toHaveTextContent(/\$\s20\.000,00/);
    expect(fila).toHaveTextContent(/\$\s2\.000,00/);
    expect(fila).toHaveTextContent(/\$\s22\.000,00/);
    expect(fila).toHaveTextContent('Confirmado');
    expect(screen.getByRole('columnheader', { name: 'Capitán' })).toBeInTheDocument();
  });

  it('en un torneo individual no hay columna de equipo y el que paga es el jugador', async () => {
    libro([pago(1, { equipoNombre: null })]);

    await filas();
    expect(screen.queryByRole('columnheader', { name: 'Equipo' })).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Jugador' })).toBeInTheDocument();
  });

  it('busca por equipo, jugador o comprobante sin importar tildes, y filtra por estado', async () => {
    const user = libro([
      pago(1, { equipoNombre: 'Deportivo Luján' }),
      pago(2, { equipoNombre: 'Los Galácticos' }),
      pago(3, { equipoNombre: 'La Furia FC', estado: 'REVERTIDO' }),
    ]);
    await filas();

    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar en el libro de ingresos' }),
      'lujan'
    );
    expect(await filas()).toHaveLength(1);
    expect((await filas())[0]).toHaveTextContent('Deportivo Luján');

    await user.clear(screen.getByRole('searchbox', { name: 'Buscar en el libro de ingresos' }));
    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar en el libro de ingresos' }),
      'I7-102'
    );
    expect((await filas())[0]).toHaveTextContent('Los Galácticos');

    await user.clear(screen.getByRole('searchbox', { name: 'Buscar en el libro de ingresos' }));
    await user.selectOptions(screen.getByLabelText('Filtrar por estado'), 'REVERTIDO');
    const devueltos = await filas();
    expect(devueltos).toHaveLength(1);
    expect(devueltos[0]).toHaveTextContent('Devuelto');

    await user.selectOptions(screen.getByLabelText('Filtrar por estado'), 'CONFIRMADO');
    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar en el libro de ingresos' }),
      'furia'
    );
    expect(
      await screen.findByText('No hay pagos que coincidan con la búsqueda.')
    ).toBeInTheDocument();
  });

  it('pagina de a 10', async () => {
    const user = libro(Array.from({ length: 16 }, (_, i) => pago(i + 1)));

    expect(await filas()).toHaveLength(10);
    expect(screen.getByText('Mostrando 1 a 10 de 16 pagos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Anterior/ })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /Siguiente/ }));

    expect(await filas()).toHaveLength(6);
    expect(screen.getByText('Mostrando 11 a 16 de 16 pagos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Siguiente/ })).toBeDisabled();
  });

  it('sin pagos lo dice', async () => {
    libro([]);

    expect(
      await screen.findByText('Todavía no entró ningún pago de inscripción.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
