import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { EstadoTorneo, MisTorneos } from '../api/torneoApi';
import {
  leerMultipart,
  prepararTorneoACancelar,
  TORNEO_A_CANCELAR,
} from '../mocks/cancelacionHandlers';
import { server } from '../mocks/server';
import { renderRuta } from '../test/renderRuta';

/** La consola del torneo a cancelar, como su organizador; sin rifa. */
const consola = (estado: EstadoTorneo = 'EN_CURSO') => {
  prepararTorneoACancelar(estado);
  server.use(
    http.get(`${API_URL}/torneos/opciones`, () => HttpResponse.json({ checkinDuracionMaxMin: 60 })),
    http.get(`${API_URL}/rifas/mis-rifas`, () =>
      HttpResponse.json({
        content: [],
        page: { size: 100, number: 0, totalElements: 0, totalPages: 0 },
      })
    )
  );
  return renderRuta(`/torneos/${TORNEO_A_CANCELAR}/consola`, { usuario: 'organizador' });
};

/** Lo que llega en el multipart de la cancelación; de cada archivo, su nombre. */
const espiarCancelacion = () => {
  const enviados: Map<string, string>[] = [];
  server.use(
    http.post(`${API_URL}/torneos/${TORNEO_A_CANCELAR}/cancelacion`, async ({ request }) => {
      enviados.push(await leerMultipart(request.clone()));
    })
  );
  return enviados;
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const misTorneosEnRevision: MisTorneos = {
  content: [
    {
      id: 7,
      nombre: 'Apertura F5',
      disciplina: 'Fútbol 5',
      estado: 'CANCELACION_EN_REVISION',
      pasoPendiente: null,
      sede: 'Club Mercedes',
      cupoMaximo: 16,
      inscriptos: 3,
      pozo: 3000,
      pozoEstimado: false,
      moneda: 'ARS',
      fechaInicio: '2026-12-01T15:00:00Z',
      modificadoEn: '2026-11-10T12:00:00Z',
    },
  ],
  page: { number: 0, size: 20, totalElements: 1, totalPages: 1 },
  porEstado: {
    BORRADOR: 0,
    INSCRIPCION_ABIERTA: 0,
    INSCRIPCION_CERRADA: 0,
    EN_CURSO: 0,
    FINALIZADO: 0,
    CANCELACION_EN_REVISION: 1,
    CANCELADO: 0,
  },
  disciplinas: ['Fútbol 5'],
};

describe('Cancelación de torneos (HU-605)', () => {
  it('Mis torneos muestra «Cancelación en revisión» en la tarjeta y en su pestaña', async () => {
    server.use(
      http.get(`${API_URL}/torneos/mis-torneos`, () => HttpResponse.json(misTorneosEnRevision))
    );

    await renderRuta('/mis-torneos', { usuario: 'organizador' });

    expect(
      await screen.findByRole('button', { name: 'Cancelación en revisión (1)' })
    ).toBeInTheDocument();
    expect(screen.getAllByText('Cancelación en revisión').length).toBeGreaterThan(0);
  });

  describe('cancelar desde la consola', () => {
    it('el modal muestra lo que hay en custodia, el pozo y lo máximo que se puede retener', async () => {
      const { user } = await consola();

      await user.click(await screen.findByRole('button', { name: 'Cancelar torneo' }));

      const modal = await screen.findByRole('dialog', {
        name: '¿Cancelar el torneo y devolver la plata?',
      });
      expect(within(modal).getByText('$ 22.000,00')).toBeInTheDocument();
      expect(within(modal).getByText(/1 pago/)).toBeInTheDocument();
      expect(within(modal).getByText('Billetera de cada participante')).toBeInTheDocument();
      expect(
        await within(modal).findByText(/Hasta \$ 4\.000,00 \(20 % del pozo de \$ 20\.000,00\)/)
      ).toBeInTheDocument();
    });

    it('sin motivo o sin confirmar no se puede ejecutar; con los dos, cancela y la consola lo muestra', async () => {
      const enviados = espiarCancelacion();
      const { user } = await consola();
      await user.click(await screen.findByRole('button', { name: 'Cancelar torneo' }));
      const modal = await screen.findByRole('dialog');
      const ejecutar = within(modal).getByRole('button', {
        name: 'Ejecutar cancelación y reintegro',
      });

      expect(ejecutar).toBeDisabled();
      await user.type(
        within(modal).getByLabelText(/Motivo de la cancelación/),
        'Se inundó la cancha'
      );
      expect(ejecutar).toBeDisabled();
      await user.click(within(modal).getByLabelText(/Confirmo la cancelación irreversible/));
      expect(ejecutar).toBeEnabled();
      await user.click(ejecutar);

      expect(
        await screen.findByText('Torneo cancelado: se devolvió todo a los participantes.')
      ).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(enviados[0].get('motivo')).toBe('Se inundó la cancha');
      expect(enviados[0].has('gastos[0].monto')).toBe(false);
      expect(await screen.findAllByText('Cancelado')).not.toHaveLength(0);
      expect(screen.queryByRole('button', { name: 'Cancelar torneo' })).not.toBeInTheDocument();
    });

    it('volver a la consola cierra el modal sin cancelar', async () => {
      const enviados = espiarCancelacion();
      const { user } = await consola();
      await user.click(await screen.findByRole('button', { name: 'Cancelar torneo' }));

      await user.click(
        within(await screen.findByRole('dialog')).getByRole('button', {
          name: 'Volver a la consola',
        })
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(enviados).toHaveLength(0);
    });

    it.each<EstadoTorneo>(['INSCRIPCION_ABIERTA', 'INSCRIPCION_CERRADA'])(
      'con %s también se puede cancelar',
      async (estado) => {
        await consola(estado);
        expect(await screen.findByRole('button', { name: 'Cancelar torneo' })).toBeInTheDocument();
      }
    );

    it('un torneo finalizado no ofrece cancelar', async () => {
      await consola('FINALIZADO');
      expect(await screen.findByText('Apertura F5')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Cancelar torneo' })).not.toBeInTheDocument();
    });
  });

  describe('gastos a retener', () => {
    const pdf = () => new File(['%PDF-1.7 factura'], 'cancha.pdf', { type: 'application/pdf' });

    const abrirConGasto = async (monto: string) => {
      const enviados = espiarCancelacion();
      const r = await consola();
      await r.user.click(await screen.findByRole('button', { name: 'Cancelar torneo' }));
      const modal = await screen.findByRole('dialog');
      await within(modal).findByText(/Hasta \$ 4\.000,00/);
      await r.user.type(within(modal).getByLabelText(/Motivo de la cancelación/), 'Lluvia');
      await r.user.click(within(modal).getByLabelText(/Confirmo la cancelación irreversible/));
      await r.user.click(within(modal).getByRole('button', { name: 'Agregar gasto' }));
      await r.user.type(
        within(modal).getByLabelText('Concepto del gasto 1'),
        'Alquiler de la cancha'
      );
      await r.user.type(within(modal).getByLabelText('Monto del gasto 1 ($)'), monto);
      return { ...r, modal, enviados };
    };

    it('con un gasto sin comprobante no se puede enviar y avisa; con el comprobante va a revisión', async () => {
      const { user, modal, enviados } = await abrirConGasto('3000');
      const enviar = within(modal).getByRole('button', { name: 'Enviar a revisión de soporte' });

      expect(enviar).toBeDisabled();
      expect(
        within(modal).getByText('Debe adjuntar un comprobante válido por cada gasto declarado')
      ).toBeInTheDocument();
      await user.upload(within(modal).getByLabelText('Comprobante del gasto 1'), pdf());
      expect(enviar).toBeEnabled();
      expect(
        within(modal).getByText(/Total declarado: \$ 3\.000,00 de \$ 4\.000,00/)
      ).toBeInTheDocument();
      await user.click(enviar);

      expect(
        await screen.findByText('Cancelación enviada a revisión de soporte.')
      ).toBeInTheDocument();
      expect(enviados[0].get('gastos[0].concepto')).toBe('Alquiler de la cancha');
      expect(enviados[0].get('gastos[0].monto')).toBe('3000');
      // el archivo va como parte del multipart (jsdom no conserva el nombre al enviarlo)
      expect(enviados[0].has('gastos[0].comprobante')).toBe(true);
      expect(await screen.findAllByText('Cancelación en revisión')).not.toHaveLength(0);
    });

    it('por encima del tope no se puede enviar y dice cuál es el máximo', async () => {
      const { user, modal } = await abrirConGasto('4000.01');
      await user.upload(within(modal).getByLabelText('Comprobante del gasto 1'), pdf());

      expect(
        within(modal).getByRole('button', { name: 'Enviar a revisión de soporte' })
      ).toBeDisabled();
      expect(
        within(modal).getByText(
          'Los gastos a retener no pueden superar el 20% del pozo. El monto excedente debe ser devuelto a los participantes.'
        )
      ).toBeInTheDocument();
    });

    it('quitar el gasto vuelve a la cancelación con reintegro total', async () => {
      const { user, modal } = await abrirConGasto('100');

      await user.click(within(modal).getByRole('button', { name: 'Quitar el gasto 1' }));

      expect(within(modal).queryByLabelText('Concepto del gasto 1')).not.toBeInTheDocument();
      expect(
        within(modal).getByRole('button', { name: 'Ejecutar cancelación y reintegro' })
      ).toBeEnabled();
    });

    it('un error del back sobre un comprobante queda junto a ese gasto y el modal sigue abierto', async () => {
      const { user, modal } = await abrirConGasto('100');
      server.use(
        http.post(`${API_URL}/torneos/${TORNEO_A_CANCELAR}/cancelacion`, () =>
          HttpResponse.json(
            {
              status: 400,
              codigo: 'VALIDACION',
              detail: 'Hay campos inválidos',
              errores: [
                {
                  campo: 'gastos[0].comprobante',
                  codigo: 'FORMATO_INVALIDO',
                  mensaje: 'Tiene que ser un PDF, JPG o PNG',
                },
              ],
            },
            { status: 400, headers: { 'Content-Type': 'application/problem+json' } }
          )
        )
      );
      await user.upload(within(modal).getByLabelText('Comprobante del gasto 1'), pdf());
      await user.click(within(modal).getByRole('button', { name: 'Enviar a revisión de soporte' }));

      expect(
        await within(modal).findByText('Tiene que ser un PDF, JPG o PNG.')
      ).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
