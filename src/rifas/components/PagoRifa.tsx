import React, { useEffect, useState } from 'react';
import { CompraRifa, ReservaRifa } from '../../api/rifaApi';
import { fechaHora, pesos } from '../../shared/formato';
import { Button, Modal } from '../../shared/ui';

interface PagoRifaProps {
  /** null con el popup cerrado. */
  reserva: ReservaRifa | null;
  /** El comprobante, después de pagar. */
  compra: CompraRifa | null;
  pagando: boolean;
  error: string | null;
  onPagar: () => void;
  onCancelar: () => void;
  onCerrar: () => void;
}

/** Lo que falta para `hasta`, en segundos y actualizado cada segundo. */
const useSegundosHasta = (hasta: string | null): number => {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (!hasta) return undefined;
    const intervalo = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(intervalo);
  }, [hasta]);
  return hasta ? Math.max(0, Math.floor((new Date(hasta).getTime() - ahora) / 1000)) : 0;
};

const reloj = (segundos: number): string =>
  `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;

/**
 * El pago simulado de la compra (PICA-223): con los números ya reservados muestra lo que se cobra y cuánto queda de
 * la reserva. "Aceptar" hace el cobro, como lo hará la pasarela; después muestra el comprobante.
 */
export const PagoRifa: React.FC<PagoRifaProps> = ({
  reserva,
  compra,
  pagando,
  error,
  onPagar,
  onCancelar,
  onCerrar,
}) => {
  const segundos = useSegundosHasta(compra ? null : (reserva?.venceEn ?? null));
  const vencida = !compra && reserva !== null && segundos === 0;

  if (compra) {
    return (
      <Modal
        isOpen
        title="¡Compra confirmada!"
        onClose={onCerrar}
        footer={<Button onClick={onCerrar}>Listo</Button>}
      >
        <dl className="rifas-resumen">
          <div>
            <dt>Comprobante</dt>
            <dd className="pago-codigo">{compra.ticketCodigo}</dd>
          </div>
          <div>
            <dt>Fecha</dt>
            <dd>{fechaHora(compra.compradoEn)}</dd>
          </div>
          <div className="rifas-resumen-ancho">
            <dt>Tus números</dt>
            <dd>{compra.numeros.join(', ')}</dd>
          </div>
          <div className="rifas-resumen-ancho">
            <dt>Pagaste</dt>
            <dd>
              {pesos(compra.total)} ({pesos(compra.monto)} de números +{' '}
              {pesos(compra.gastosAdministrativos)} de gastos administrativos)
            </dd>
          </div>
        </dl>
      </Modal>
    );
  }

  if (!reserva) {
    return null;
  }

  return (
    <Modal
      isOpen
      title="Pagar la compra"
      onClose={onCancelar}
      closeDisabled={pagando}
      footer={
        <>
          <Button variant="ghost" onClick={onCancelar} disabled={pagando}>
            Cancelar
          </Button>
          <Button onClick={onPagar} loading={pagando} disabled={vencida}>
            Aceptar
          </Button>
        </>
      }
    >
      <div className="alerta alerta-info pago-simulado">
        <strong>Pago simulado.</strong> Esta pantalla es temporal: más adelante, al aceptar, se va a
        redirigir a la plataforma de pago.
      </div>
      {error && (
        <div className="alerta alerta-peligro" role="alert">
          {error}
        </div>
      )}
      <p className={`pago-reloj${vencida ? ' vencida' : ''}`} role="status">
        {vencida
          ? 'Se terminó el tiempo de la reserva: los números volvieron a estar disponibles.'
          : `Tus números quedan reservados ${reloj(segundos)} mientras pagás.`}
      </p>
      <table className="pago-detalle">
        <tbody>
          <tr>
            <th scope="row">Números</th>
            <td>{reserva.numeros.join(', ')}</td>
          </tr>
          <tr>
            <th scope="row">
              {reserva.numeros.length} × {pesos(reserva.precioNumero)}
            </th>
            <td>{pesos(reserva.monto)}</td>
          </tr>
          <tr>
            <th scope="row">
              Gastos administrativos
              {reserva.pctGastosAdministrativos != null &&
                ` (${reserva.pctGastosAdministrativos}%)`}
            </th>
            <td>{pesos(reserva.gastosAdministrativos)}</td>
          </tr>
          <tr className="pago-total">
            <th scope="row">Total</th>
            <td>{pesos(reserva.total)}</td>
          </tr>
        </tbody>
      </table>
    </Modal>
  );
};
